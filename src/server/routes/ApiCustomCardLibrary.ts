import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {RouteError} from './RouteError';
import {readBody} from './readBody';
import {Database} from '../database/Database';
import {generateRandomId} from '../utils/server-ids';
import {safeCast} from '../../common/Types';
import {QuotaConfig, QuotaHandler, getQuotaConfigsFromEnv} from '../server/QuotaHandler';
import {decodeCustomCard, encodeCustomCard, validateCustomCard, CustomCardCodecError} from '../../common/cards/customCardCodec';
import {isCuratedBehavior} from '../../common/cards/curatedBehaviorTemplates';
import {isCuratedRenderData} from '../../common/cards/curatedCardRenderData';
import {
  CustomCardDefinition,
  MAX_CUSTOM_CARD_COST,
  MAX_CUSTOM_CARD_DESCRIPTION_LENGTH,
  MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH,
  MAX_CUSTOM_CARD_NAME_LENGTH,
  MAX_CUSTOM_CARD_REQUIREMENTS,
  MAX_CUSTOM_CARD_TAGS,
  MIN_CUSTOM_CARD_COST,
} from '../../common/cards/CustomCardDefinition';
import {
  isCustomCardEntryId,
  CustomCardLibraryEntry,
  MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH,
} from '../../common/cards/CustomCardLibraryEntry';
import {CardName} from '../../common/cards/CardName';

type SubmitCardRequest = {
  code?: string;
  definition?: CustomCardDefinition;
  submittedBy?: string;
};

// CUSTOM_CARD_LIBRARY_SUBMIT_QUOTA accepts either a single {limit, per} object, or a JSON array
// of them for multiple independent tiers. A request must satisfy every configured tier to succeed.
function getQuotaConfigs(): Array<QuotaConfig> {
  return getQuotaConfigsFromEnv('CUSTOM_CARD_LIBRARY_SUBMIT_QUOTA', {limit: 5, perMs: 60 * 60 * 1000});
}

// Every real card name, so a submission can never collide with an official card's identity.
const REAL_CARD_NAMES: ReadonlySet<string> = new Set(Object.values(CardName));

function trimAndCap(value: string | undefined, maxLength: number, fieldName: string): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length > maxLength) {
    throw RouteError.badRequest(`${fieldName} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/** Structural validation on top of `decodeCustomCard`'s own checks -- this is the untrusted-input
 * boundary, so every field gets bounded here regardless of what the client already validated. */
function validateSubmission(def: CustomCardDefinition): void {
  if (def.cardName.trim() === '' || def.cardName.length > MAX_CUSTOM_CARD_NAME_LENGTH) {
    throw RouteError.badRequest(`name must be 1-${MAX_CUSTOM_CARD_NAME_LENGTH} characters`);
  }
  if (def.description.length > MAX_CUSTOM_CARD_DESCRIPTION_LENGTH) {
    throw RouteError.badRequest(`description must be at most ${MAX_CUSTOM_CARD_DESCRIPTION_LENGTH} characters`);
  }
  if (def.cost < MIN_CUSTOM_CARD_COST || def.cost > MAX_CUSTOM_CARD_COST || !Number.isInteger(def.cost)) {
    throw RouteError.badRequest(`cost must be an integer between ${MIN_CUSTOM_CARD_COST} and ${MAX_CUSTOM_CARD_COST}`);
  }
  if (def.tags.length > MAX_CUSTOM_CARD_TAGS) {
    throw RouteError.badRequest(`at most ${MAX_CUSTOM_CARD_TAGS} tags allowed`);
  }
  if (def.requirements.length > MAX_CUSTOM_CARD_REQUIREMENTS) {
    throw RouteError.badRequest(`at most ${MAX_CUSTOM_CARD_REQUIREMENTS} requirements allowed`);
  }
  if ((def.effectDescription ?? '').length > MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH) {
    throw RouteError.badRequest(`effect description must be at most ${MAX_CUSTOM_CARD_EFFECT_DESCRIPTION_LENGTH} characters`);
  }
  if (def.behavior === undefined && (def.effectDescription ?? '').trim() === '') {
    throw RouteError.badRequest('provide either a curated effect or an effect description');
  }
  // The actual security boundary: a public submission's behavior must be provably drawn from the
  // curated picker's whitelist -- anything else needs an admin's set-behavior override instead.
  if (def.behavior !== undefined && !isCuratedBehavior(def.behavior)) {
    throw RouteError.badRequest('behavior is not a recognized curated effect');
  }
  // Same boundary for the icon tree: some ICardRenderItem fields (text/innerText) are rendered
  // via v-html client-side, so a public submission's renderData must be provably drawn from the
  // icon composer's whitelist too, or it's a stored-XSS vector once the card is shown to players.
  if (!isCuratedRenderData(def.renderData)) {
    throw RouteError.badRequest('renderData is not a recognized curated icon tree');
  }
}

/**
 * The public custom-card review queue shown on /cards: community-submitted playable cards.
 *
 * GET lists every entry (small, curated list -- no pagination). POST submits a new entry,
 * tagged 'submitted' until an admin approves it via `ApiCustomCardLibraryReview`.
 */
export class ApiCustomCardLibrary extends Handler {
  public static readonly INSTANCE = new ApiCustomCardLibrary();
  private quotaHandlers: Array<QuotaHandler>;

  public constructor(quotaConfigs: Array<QuotaConfig> = getQuotaConfigs()) {
    super();
    this.quotaHandlers = quotaConfigs.map((config) => new QuotaHandler(config));
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    const entries = await Database.getInstance().listCustomCardLibraryEntries();
    responses.writeJson(res, ctx, entries);
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const withinQuota = this.quotaHandlers.every((handler) => handler.measure(ctx));
    if (!withinQuota) {
      responses.quotaExceeded(req, res);
      return;
    }

    let body: SubmitCardRequest;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      throw RouteError.badRequest('invalid body');
    }

    let definition: CustomCardDefinition;
    if (typeof body.code === 'string' && body.code.trim() !== '') {
      try {
        definition = decodeCustomCard(body.code.trim());
      } catch (e) {
        if (e instanceof CustomCardCodecError) {
          throw RouteError.badRequest(e.message);
        }
        throw e;
      }
    } else if (body.definition !== undefined) {
      definition = body.definition;
    } else {
      throw RouteError.badRequest('code or definition is required');
    }

    validateSubmission(definition);
    if (REAL_CARD_NAMES.has(definition.cardName)) {
      throw RouteError.badRequest('that name is already used by a real card');
    }
    const existingEntries = await Database.getInstance().listCustomCardLibraryEntries();
    if (existingEntries.some((e) => e.definition.cardName === definition.cardName)) {
      throw RouteError.badRequest('that name is already used by another custom card');
    }
    const warnings = validateCustomCard(definition);
    const submittedBy = trimAndCap(body.submittedBy, MAX_CUSTOM_CARD_SUBMITTED_BY_LENGTH, 'submittedBy');

    const entry: CustomCardLibraryEntry = {
      id: safeCast(generateRandomId('c'), isCustomCardEntryId),
      definition,
      shareCode: encodeCustomCard(definition),
      submittedBy,
      status: 'submitted',
      createdAt: ctx.clock.now(),
    };
    await Database.getInstance().insertCustomCardLibraryEntry(entry);
    responses.writeJson(res, ctx, {entry, warnings});
  }
}

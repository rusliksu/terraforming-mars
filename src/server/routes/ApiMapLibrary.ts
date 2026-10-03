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
import {decodeCustomBoard, validateCustomBoard, CustomBoardCodecError} from '../../common/boards/customBoardCodec';
import {
  isMapLibraryEntryId,
  MapLibraryEntry,
  MAX_MAP_LIBRARY_DESCRIPTION_LENGTH,
  MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH,
} from '../../common/boards/MapLibraryEntry';

type SubmitMapRequest = {
  code?: string;
  description?: string;
  submittedBy?: string;
};

// MAP_LIBRARY_SUBMIT_QUOTA accepts either a single {limit, per} object, or a JSON array of them
// for multiple independent tiers. A request must satisfy every configured tier to succeed.
function getQuotaConfigs(): Array<QuotaConfig> {
  return getQuotaConfigsFromEnv('MAP_LIBRARY_SUBMIT_QUOTA', {limit: 5, perMs: 60 * 60 * 1000});
}

function trimAndCap(value: string | undefined, maxLength: number, fieldName: string): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length > maxLength) {
    throw RouteError.badRequest(`${fieldName} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/**
 * The public Map Library: official boards plus community-submitted custom maps.
 *
 * GET lists every entry (small, curated list -- no pagination). POST submits a new fanmade
 * entry, tagged 'submitted' until an admin approves it via `ApiMapLibraryReview`.
 */
export class ApiMapLibrary extends Handler {
  public static readonly INSTANCE = new ApiMapLibrary();
  private quotaHandlers: Array<QuotaHandler>;

  public constructor(quotaConfigs: Array<QuotaConfig> = getQuotaConfigs()) {
    super();
    this.quotaHandlers = quotaConfigs.map((config) => new QuotaHandler(config));
  }

  public override async get(_req: Request, res: Response, ctx: Context): Promise<void> {
    const entries = await Database.getInstance().listMapLibraryEntries();
    responses.writeJson(res, ctx, entries);
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const withinQuota = this.quotaHandlers.every((handler) => handler.measure(ctx));
    if (!withinQuota) {
      responses.quotaExceeded(req, res);
      return;
    }

    let body: SubmitMapRequest;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      throw RouteError.badRequest('invalid body');
    }

    if (typeof body.code !== 'string' || body.code.trim() === '') {
      throw RouteError.badRequest('code is required');
    }
    const code = body.code.trim();
    const description = trimAndCap(body.description, MAX_MAP_LIBRARY_DESCRIPTION_LENGTH, 'description');
    const submittedBy = trimAndCap(body.submittedBy, MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH, 'submittedBy');

    let warnings: Array<string>;
    try {
      const def = decodeCustomBoard(code);
      warnings = validateCustomBoard(def);
    } catch (e) {
      if (e instanceof CustomBoardCodecError) {
        throw RouteError.badRequest(e.message);
      }
      throw e;
    }

    const entry: MapLibraryEntry = {
      id: safeCast(generateRandomId('m'), isMapLibraryEntryId),
      code,
      description,
      submittedBy,
      origin: 'fanmade',
      status: 'submitted',
      createdAt: ctx.clock.now(),
    };
    await Database.getInstance().insertMapLibraryEntry(entry);
    responses.writeJson(res, ctx, {entry, warnings});
  }
}

import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {RouteError} from './RouteError';
import {readBody} from './readBody';
import {Database} from '../database/Database';
import {isCustomCardEntryId} from '../../common/cards/CustomCardLibraryEntry';
import {encodeCustomCard} from '../../common/cards/customCardCodec';
import {validateBehavior} from '../cards/Card';
import {Behavior} from '../behavior/Behavior';
import {CardName} from '../../common/cards/CardName';
import {refreshCustomCardRegistry} from '../cards/CustomCardRegistry';

type ReviewRequest = {
  id?: string;
  action?: 'approve' | 'delete' | 'set-behavior';
  // 'set-behavior' only: raw Behavior JSON. Admin-trusted -- no curated-vocabulary restriction
  // here (unlike ApiCustomCardLibrary.ts's public submit path).
  behavior?: Behavior;
};

/**
 * Admin review of the custom card library: approve a submitted card (only once it has a
 * `behavior`, whether from the curated picker or this route's set-behavior action), delete an
 * entry (which also serves as "reject" for a submitted card, or as ordinary housekeeping for an
 * approved one), or attach/replace a card's `behavior` -- the escape hatch for a submission whose
 * effect was described in free text rather than the curated picker. Guarded by `validateServerId`,
 * same as the games-overview admin purge and the Map Library's review route.
 */
export class ApiCustomCardLibraryReview extends Handler {
  public static readonly INSTANCE = new ApiCustomCardLibraryReview();
  private constructor() {
    super({validateServerId: true});
  }

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    let body: ReviewRequest;
    try {
      body = JSON.parse(await readBody(req));
    } catch (e) {
      throw RouteError.badRequest('invalid body');
    }

    if (typeof body.id !== 'string' || !isCustomCardEntryId(body.id)) {
      throw RouteError.badRequest('invalid id');
    }
    const id = body.id;

    const db = Database.getInstance();
    const entry = await db.getCustomCardLibraryEntry(id);
    if (entry === undefined) {
      throw RouteError.notFound('custom card library entry not found');
    }

    switch (body.action) {
    case 'approve':
      if (entry.definition.behavior === undefined) {
        throw RouteError.badRequest('attach an effect (set-behavior) before approving');
      }
      await db.setCustomCardLibraryEntryStatus(id, 'approved');
      break;
    case 'set-behavior': {
      if (body.behavior === undefined || typeof body.behavior !== 'object') {
        throw RouteError.badRequest('behavior is required');
      }
      try {
        validateBehavior(body.behavior, entry.definition.cardName as unknown as CardName);
      } catch (e) {
        throw RouteError.badRequest(e instanceof Error ? e.message : String(e));
      }
      const definition = {...entry.definition, behavior: body.behavior};
      await db.updateCustomCardLibraryEntry(id, {
        ...entry,
        definition,
        shareCode: encodeCustomCard(definition),
      });
      break;
    }
    case 'delete':
      await db.deleteCustomCardLibraryEntry(id);
      break;
    default:
      throw RouteError.badRequest('specify an action of "approve", "delete", or "set-behavior"');
    }

    await refreshCustomCardRegistry();
    responses.writeJson(res, ctx, {ok: true});
  }
}

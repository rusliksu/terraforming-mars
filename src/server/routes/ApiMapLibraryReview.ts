import * as responses from '../server/responses';
import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {RouteError} from './RouteError';
import {readBody} from './readBody';
import {Database} from '../database/Database';
import {isMapLibraryEntryId} from '../../common/boards/MapLibraryEntry';

type ReviewRequest = {
  id?: string;
  action?: 'approve' | 'delete';
};

/**
 * Admin review of the Map Library: approve a submitted fanmade map, or delete an entry
 * (which also serves as "reject" for a submitted map). Guarded by `validateServerId`, same
 * as the games-overview admin purge.
 */
export class ApiMapLibraryReview extends Handler {
  public static readonly INSTANCE = new ApiMapLibraryReview();
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

    if (typeof body.id !== 'string' || !isMapLibraryEntryId(body.id)) {
      throw RouteError.badRequest('invalid id');
    }
    const id = body.id;

    const db = Database.getInstance();
    const entry = await db.getMapLibraryEntry(id);
    if (entry === undefined) {
      throw RouteError.notFound('map library entry not found');
    }

    switch (body.action) {
    case 'approve':
      if (entry.origin === 'official') {
        throw RouteError.badRequest('official maps are always approved');
      }
      await db.setMapLibraryEntryStatus(id, 'approved');
      break;
    case 'delete':
      await db.deleteMapLibraryEntry(id);
      break;
    default:
      throw RouteError.badRequest('specify an action of "approve" or "delete"');
    }

    responses.writeJson(res, ctx, {ok: true});
  }
}

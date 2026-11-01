import {Handler} from './Handler';
import {Context} from './IHandler';
import {ServeApp} from './ServeApp';
import {ServeAsset} from './ServeAsset';
import * as responses from '../server/responses';
import {Request} from '../Request';
import {Response} from '../Response';

// The admin game list is protected by the server id. Without that id the public
// statistics page is the useful destination instead of a dead "forbidden" screen.
export class GamesOverview extends Handler {
  public static INSTANCE: ServeApp = new GamesOverview();
  private constructor() {
    super({validateServerId: false});
  }
  public override get(req: Request, res: Response, ctx: Context): Promise<void> {
    if (!this.hasServerIdAccess(ctx)) {
      responses.redirect(res, '/stats');
      return Promise.resolve();
    }
    req.url = '/assets/index.html';
    return ServeAsset.INSTANCE.get(req, res, ctx);
  }
}

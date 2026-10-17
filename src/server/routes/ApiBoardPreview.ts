import {Handler} from './Handler';
import {Context} from './IHandler';
import {Request} from '../Request';
import {Response} from '../Response';
import {readBody} from './readBody';
import {RouteError} from './RouteError';
import {createBoardPreview, parseBoardPreviewRequest} from '../models/BoardPreview';
import * as responses from '../server/responses';

/** Public read-only layout projection; no game id, game loader or database access. */
export class ApiBoardPreview extends Handler {
  public static readonly INSTANCE = new ApiBoardPreview();

  public override async post(req: Request, res: Response, ctx: Context): Promise<void> {
    const body = await readBody(req);
    try {
      const request = parseBoardPreviewRequest(JSON.parse(body));
      responses.writeJson(res, ctx, createBoardPreview(request));
    } catch (error) {
      throw RouteError.badRequest(error instanceof Error ? error.message : 'Invalid board preview options.');
    }
  }
}

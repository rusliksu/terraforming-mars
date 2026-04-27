import {expect} from 'chai';
import {paths} from '@/common/app/paths';
import {statusCode} from '@/common/http/statusCode';
import {getLoadErrorMessage} from '@/client/utils/loadErrorMessage';

describe('App', () => {
  it('shows a specific message for stale game links', () => {
    expect(getLoadErrorMessage(paths.GAME, statusCode.notFound)).contains('Game not found');
  });

  it('keeps the generic message for other load failures', () => {
    expect(getLoadErrorMessage(paths.GAME, statusCode.internalServerError)).eq('Error getting game data');
  });
});

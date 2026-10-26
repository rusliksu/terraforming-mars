import {expect} from 'chai';
import {PlayerInput} from '../../src/server/routes/PlayerInput';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {SelectOption} from '../../src/server/inputs/SelectOption';
import {DiscordUser} from '../../src/server/server/auth/discord';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {testGame} from '../TestGame';

type PostOptions = {
  user?: DiscordUser;
  owned?: boolean;
  allowUnauthenticated?: string | undefined;
  serverId?: string;
};

type Result = {
  statusCode: number;
  content: string;
  waiting: boolean;
};

function user(id: string): DiscordUser {
  return {id, username: id, discriminator: '0000'};
}

async function post(options: PostOptions = {}): Promise<Result> {
  const originalAllow = process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT;
  if (options.allowUnauthenticated === undefined) {
    delete process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT;
  } else {
    process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT = options.allowUnauthenticated;
  }
  try {
    const [game, blue] = testGame(2);
    if (options.owned !== false) {
      blue.user = 'discord-owner';
    }
    blue.setWaitingFor(new OrOptions(
      new SelectOption('Option A', 'A'),
      new SelectOption('Option B', 'B'),
    ));

    const req = new MockRequest();
    const scaffolding = new RouteTestScaffolding(req);
    await scaffolding.ctx.gameLoader.add(game);
    scaffolding.ctx.user = options.user;
    scaffolding.url = '/player/input?id=' + blue.id +
      (options.serverId === undefined ? '' : '&serverId=' + options.serverId);

    const res = new MockResponse();
    const settled = scaffolding.post(PlayerInput.INSTANCE, res);
    await new Promise((resolve) => setImmediate(resolve));
    req.emitter.emit('data', Buffer.from(JSON.stringify({
      type: 'or', index: 0, response: {type: 'option'},
    })));
    req.emitter.emit('end');
    await settled;
    return {
      statusCode: res.statusCode,
      content: res.content,
      waiting: blue.getWaitingFor() !== undefined,
    };
  } finally {
    if (originalAllow === undefined) {
      delete process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT;
    } else {
      process.env.ALLOW_LEGACY_UNAUTHENTICATED_PLAYER_INPUT = originalAllow;
    }
  }
}

describe('legacy PlayerInput ownership', () => {
  it('accepts the authenticated owner', async () => {
    const result = await post({user: user('discord-owner')});
    expect(result.statusCode).eq(200);
    expect(result.content).contains('"cardsInHand"');
  });

  it('rejects a missing session for an owned seat', async () => {
    const result = await post();
    expect(result.statusCode).eq(401);
    expect(result.content).not.contains('cardsInHand');
    expect(result.waiting).eq(true);
  });

  it('rejects a foreign session for an owned seat', async () => {
    const result = await post({user: user('discord-intruder')});
    expect(result.statusCode).eq(403);
    expect(result.content).not.contains('cardsInHand');
    expect(result.waiting).eq(true);
  });

  it('closes unowned seats by default', async () => {
    const result = await post({owned: false, user: user('discord-anyone')});
    expect(result.statusCode).eq(403);
    expect(result.content).not.contains('cardsInHand');
    expect(result.waiting).eq(true);
  });

  it('allows explicit local compatibility for an unowned seat', async () => {
    const result = await post({owned: false, allowUnauthenticated: '1'});
    expect(result.statusCode).eq(200);
    expect(result.content).contains('"cardsInHand"');
  });

  it('allows server-id access for internal automation', async () => {
    const result = await post({serverId: '1'});
    expect(result.statusCode).eq(200);
    expect(result.content).contains('"cardsInHand"');
  });
});

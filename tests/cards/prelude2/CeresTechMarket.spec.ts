import {expect} from 'chai';
import {CeresTechMarket} from '@/server/cards/prelude2/CeresTechMarket';
import {Research} from '@/server/cards/base/Research';
import {Tardigrades} from '@/server/cards/base/Tardigrades';
import {Callisto} from '@/server/colonies/Callisto';
import {Ceres} from '@/server/colonies/Ceres';
import {Miranda} from '@/server/colonies/Miranda';
import {ICard} from '@/server/cards/ICard';
import {IGame} from '@/server/IGame';
import {SelectCard} from '@/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '@/common/utils/utils';
import {CardName} from '@/common/cards/CardName';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {newProjectCard} from '@/server/createCard';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {GameLogs} from '@/server/routes/GameLogs';

describe('CeresTechMarket', () => {
  let card: CeresTechMarket;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CeresTechMarket();
    [game, player] = testGame(2, {coloniesExtension: true});
    game.colonies = [new Callisto(), new Ceres(), new Miranda()];
  });

  for (const run of [
    {colonies: 0, expected: 0},
    {colonies: 1, expected: 2},
    {colonies: 2, expected: 4},
    {colonies: 3, expected: 6},
  ] as const) {
    it('play ' + JSON.stringify(run), () => {
      game.colonies[0].colonies = Array(run.colonies).fill(player.id);
      card.play(player);
      expect(player.megaCredits).to.eq(run.expected);
    });
  }

  it('canAct', () => {
    expect(card.canAct(player)).is.false;

    player.cardsInHand.push(new Research());
    expect(card.canAct(player)).is.true;
  });

  it('action allows discarding 0 cards', () => {
    const research = new Research();
    player.cardsInHand.push(research);

    const selectCard = cast(card.action(player), SelectCard<ICard>);
    selectCard.cb([]);

    expect(player.megaCredits).to.eq(0);
    expect(player.cardsInHand).deep.eq([research]);
  });

  it('action discards N cards for 2 M€ each', () => {
    const research = new Research();
    const tardigrades = new Tardigrades();
    player.cardsInHand.push(research, tardigrades);

    const selectCard = cast(card.action(player), SelectCard<ICard>);
    selectCard.cb([research, tardigrades]);

    expect(player.megaCredits).to.eq(4);
    expect(player.cardsInHand).has.lengthOf(0);
    expect(game.projectDeck.discardPile).deep.eq([research, tardigrades]);
  });

  it('logs discarded action cards by name for the player and spectator', () => {
    const otherPlayer = game.players[1];
    const discardedCards = [
      newProjectCard(CardName.ALGAE)!,
      newProjectCard(CardName.ANTS)!,
    ];
    game.gameLog = [];
    player.cardsInHand = [...discardedCards];
    player.megaCredits = 0;

    const selectCard = cast(card.action(player), SelectCard<IProjectCard>);
    selectCard.cb(discardedCards);

    expect(player.cardsInHand).is.empty;
    expect(player.megaCredits).eq(4);

    const publicMessages = game.gameLog.filter((entry) => entry.playerId === undefined);
    expect(publicMessages).has.length(1);
    expect(publicMessages[0].message).eq('${0} gained ${1} M€ by discarding ${2} cards');

    const privateMessages = game.gameLog.filter((entry) => entry.playerId === player.id);
    expect(privateMessages).has.length(1);
    expect(privateMessages[0].message).eq('${0} discarded ${1}');
    expect(privateMessages[0].data).deep.eq([
      {type: LogMessageDataType.STRING, value: 'You'},
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.ANTS]},
    ]);

    const gameLogs = new GameLogs();
    const spectatorMessages = gameLogs.getLogsForGameView(game.spectatorId, game, '1');
    const spectatorDetails = spectatorMessages.filter((entry) => entry.message === '${0} discarded ${1}');
    expect(spectatorDetails).has.length(1);
    expect(spectatorDetails[0].playerId).eq(game.spectatorId);
    expect(spectatorDetails[0].data).deep.eq([
      {type: LogMessageDataType.PLAYER, value: player.color},
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.ANTS]},
    ]);

    const otherPlayerMessages = gameLogs.getLogsForGameView(otherPlayer.id, game, '1');
    expect(otherPlayerMessages.map((entry) => entry.message)).does.not.include('${0} discarded ${1}');
  });
});

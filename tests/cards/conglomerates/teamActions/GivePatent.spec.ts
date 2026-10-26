import {expect} from 'chai';
import {GivePatent} from '../../../../src/server/cards/conglomerates/teamActions/GivePatent';
import {Ants} from '../../../../src/server/cards/base/Ants';
import {Birds} from '../../../../src/server/cards/base/Birds';
import {IGame} from '../../../../src/server/IGame';
import {testGame} from '../../../TestGame';
import {TestPlayer} from '../../../TestPlayer';
import {cast} from '../../../../src/common/utils/utils';
import {SelectCard} from '../../../../src/server/inputs/SelectCard';
import {Payment} from '../../../../src/common/inputs/Payment';
import {runAllActions} from '../../../TestingUtils';
import {ConglomeratesExpansion} from '../../../../src/server/conglomerates/ConglomeratesExpansion';

describe('GivePatent', () => {
  let card: GivePatent;
  let game: IGame;
  let player: TestPlayer;
  let teammate: TestPlayer;

  beforeEach(() => {
    card = new GivePatent();
    [game, player, , teammate] = testGame(4, {conglomeratesExpansion: true});
    player.cardsInHand = [new Ants()];
    teammate.cardsInHand = [new Birds()];
  });

  it('cannot act without a teammate', () => {
    const [, solo] = testGame(4);
    solo.cardsInHand = [new Ants()];
    solo.conglomeratesData.coordination = 5;
    expect(card.canAct(solo)).is.false;
  });

  it('cannot act without enough coordination', () => {
    player.conglomeratesData.coordination = 1;
    expect(card.canAct(player)).is.false;
  });

  it('cannot act with an empty hand', () => {
    player.conglomeratesData.coordination = 5;
    player.cardsInHand = [];
    expect(card.canAct(player)).is.false;
  });

  it('is a free (0 M€) standard project', () => {
    expect(card.cost).to.eq(0);
  });

  it('gives a card to the teammate and spends coordination', () => {
    player.conglomeratesData.coordination = 5;
    expect(card.canAct(player)).is.true;

    card.payAndExecute(player, Payment.of({megacredits: 0}));
    runAllActions(game);
    cast(player.popWaitingFor(), SelectCard).cb([player.cardsInHand[0]]);

    expect(player.cardsInHand).is.empty;
    expect(teammate.cardsInHand.map((c) => c.name)).to.deep.eq(['Birds', 'Ants']);
    expect(player.conglomeratesData.coordination).to.eq(3);
  });

  it('escalates its cost after use, only for the player who used it', () => {
    player.conglomeratesData.coordination = 5;
    card.payAndExecute(player, Payment.of({megacredits: 0}));
    runAllActions(game);
    cast(player.popWaitingFor(), SelectCard).cb([player.cardsInHand[0]]);

    expect(ConglomeratesExpansion.getTeamActionCost(player, 'givePatent')).to.eq(3);
    expect(ConglomeratesExpansion.getTeamActionCost(teammate, 'givePatent')).to.eq(2);
  });
});

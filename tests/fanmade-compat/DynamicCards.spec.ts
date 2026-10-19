import {SelfReplicatingRobots} from '../../src/server/cards/promo/SelfReplicatingRobots';
import {ProjectImitators} from '../../src/server/cards/sillyfication/ProjectImitators';
import {CardType} from '../../src/common/cards/CardType';
import {Tag} from '../../src/common/cards/Tag';
import {expect} from 'chai';
import {Game} from '../../src/server/Game';
import {DataDrivenCard} from '../../src/server/cards/DataDrivenCard';
import {DeimosDoubleDownCopy} from '../../src/server/cards/sillyfication/DeimosDoubleDownCopy';
import {blankCustomCard, CustomCardDefinition} from '../../src/common/cards/CustomCardDefinition';
import {CardName} from '../../src/common/cards/CardName';
import {Server} from '../../src/server/models/ServerModel';
import {testGame} from '../TestGame';

describe('Dynamic cards in saves', () => {
  it('preserves a non-Comet copy in hand through the actual game save', () => {
    const [game, player] = testGame(2);
    player.cardsInHand = [new DeimosDoubleDownCopy(CardName.ASTEROID)];
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    const card = restored.players[0].cardsInHand[0] as DeimosDoubleDownCopy;
    expect(card.sourceCardName).eq(CardName.ASTEROID);
    expect(card.cost).eq(14);
  });

  it('preserves definitions in hands, decks and tableau without the library', () => {
    const [game, player] = testGame(2);
    const definition = {...blankCustomCard('Pinned custom'), cost: 7, behavior: {stock: {steel: 2}}};
    player.cardsInHand = [new DataDrivenCard(definition)];
    player.playedCards.push(new DataDrivenCard(definition));
    game.projectDeck.drawPile = [new DataDrivenCard(definition)];
    const saved = JSON.parse(JSON.stringify(game.serialize()));
    new DataDrivenCard({...definition, cost: 99, behavior: {stock: {steel: 9}}});
    const restored = Game.deserialize(saved, {viewOnly: true});
    const card = restored.players[0].cardsInHand[0];
    expect(card.cost).eq(7);
    expect(card.behavior).deep.eq({stock: {steel: 2}});
    expect(restored.projectDeck.drawPile[0].cost).eq(7);
    const face = Server.getSpectatorModel(restored).players[0].tableau[0].customCard;
    expect(face?.cost).eq(7);
  });

  it('preserves nested targets and later copies without consulting the library', () => {
    const [game, player, opponent] = testGame(2);
    const definition: CustomCardDefinition = {...blankCustomCard('Nested custom'), cost: 12, type: CardType.AUTOMATED};
    const robots = new SelfReplicatingRobots();
    const target = new DataDrivenCard(definition);
    target.resourceCount = 4;
    robots.targetCards.push(target);
    player.playedCards.push(robots);
    opponent.playedCards.push(new DataDrivenCard(definition));
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    const nested = (restored.players[0].playedCards.get(robots.name) as SelfReplicatingRobots).targetCards[0];
    expect(nested.cost).eq(12);
    expect(nested.resourceCount).eq(4);
    const choice = new ProjectImitators().bespokePlay(restored.players[0]);
    choice.cb([restored.players[1].playedCards.projects()[0]]);
    expect(restored.players[0].cardsInHand.at(-1)?.cost).eq(12);
    expect(restored.players[0].cardsInHand.at(-1)?.resourceCount).eq(0);
  });

  it('pins a custom event inside a copied card', () => {
    const [game, player] = testGame(2);
    const event = new DataDrivenCard({...blankCustomCard('Copied custom'), cost: 9, type: CardType.EVENT, tags: [Tag.SPACE]});
    player.cardsInHand = [new DeimosDoubleDownCopy(event)];
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(restored.players[0].cardsInHand[0].cost).eq(9);
    expect((restored.players[0].cardsInHand[0] as DeimosDoubleDownCopy).sourceCardName).eq(event.name);
  });

  it('keeps same-name library revisions independent', () => {
    const definition = blankCustomCard('Independent versions');
    const first = new DataDrivenCard({...definition, cost: 4});
    const second = new DataDrivenCard({...definition, cost: 19});
    expect(first.cost).eq(4);
    expect(second.cost).eq(19);
  });
});

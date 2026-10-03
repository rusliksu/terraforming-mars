import {expect} from 'chai';
import {PartyName} from '../src/common/turmoil/PartyName';
import {Game} from '../src/server/Game';
import {IGame} from '../src/server/IGame';
import {TerraformingOffice} from '../src/server/cards/idesofmars/TerraformingOffice';
import {EventAnalysts} from '../src/server/cards/turmoil/EventAnalysts';
import {DrawCards} from '../src/server/deferredActions/DrawCards';
import {Bureaucrats} from '../src/server/turmoil/parties/Bureaucrats';
import {Turmoil} from '../src/server/turmoil/Turmoil';
import {testGame} from './TestGame';
import {forcePartiesInPlay} from './TestingUtils';

describe('More Parties card draws', () => {
  let game: IGame;
  let restore: () => void;

  beforeEach(() => {
    restore = forcePartiesInPlay(
      PartyName.MARS, PartyName.SCIENTISTS, PartyName.UNITY,
      PartyName.GREENS, PartyName.REDS, PartyName.KELVINISTS);
    [game] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true, idesOfMarsExpansion: true});
    game.projectDeck.drawPile = [];
    game.projectDeck.discardPile = [];
  });

  afterEach(() => restore());

  for (const source of ['top', 'bottom'] as const) {
    it(`skips absent parties when drawing from the ${source} and allows them after a swap`, () => {
      const absent = new TerraformingOffice();
      const present = new EventAnalysts();
      const deck = game.projectDeck;
      deck.drawPile = source === 'top' ? [present, absent] : [absent, present];

      expect(deck.drawN(game, 1, source)).to.deep.eq([present]);
      expect(deck.size()).to.eq(1);
      expect(deck.discardPile).to.include(absent);

      const turmoil = Turmoil.getTurmoil(game);
      turmoil.parties = turmoil.parties.map((p) => p.name === PartyName.SCIENTISTS ? new Bureaucrats() : p);
      expect(deck.drawN(game, 1, source)).to.deep.eq([absent]);
    });
  }

  it('finishes an ordinary draw when every remaining card requires an absent party', () => {
    const absent = new TerraformingOffice();
    game.projectDeck.drawPile = [absent];
    const player = game.players[0];
    const before = player.cardsInHand.length;

    expect(() => DrawCards.keepAll(player).execute()).to.not.throw();
    expect(player.cardsInHand).has.length(before);
    expect(game.projectDeck.size()).to.eq(1);
    expect(game.projectDeck.discardPile).to.include(absent);
  });

  it('restores the availability filter when loading a saved game', () => {
    game.projectDeck.drawPile = [new EventAnalysts(), new TerraformingOffice()];
    const restored = Game.deserialize(game.serialize());

    expect(restored.projectDeck.drawN(restored, 1).map((c) => c.name))
      .to.deep.eq([new EventAnalysts().name]);
    expect(restored.projectDeck.size()).to.eq(1);
  });

  it('keeps party cards available in ordinary Turmoil games', () => {
    const [ordinary] = testGame(2, {turmoilExtension: true});
    const card = new EventAnalysts();
    ordinary.projectDeck.drawPile = [card];
    ordinary.projectDeck.discardPile = [];

    expect(ordinary.projectDeck.draw(ordinary)).to.eq(card);
  });
});

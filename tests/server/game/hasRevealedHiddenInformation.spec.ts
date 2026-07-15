import {expect} from 'chai';

import {Game} from '../../../src/server/Game';
import {ArcticAlgae} from '../../../src/server/cards/base/ArcticAlgae';
import {BiomassCombustors} from '../../../src/server/cards/base/BiomassCombustors';
import {hasRevealedHiddenInformation} from '../../../src/server/game/hasRevealedHiddenInformation';
import {SelectProjectCardToPlay} from '../../../src/server/inputs/SelectProjectCardToPlay';
import {SelectStandardProjectToPlay} from '../../../src/server/inputs/SelectStandardProjectToPlay';
import {testGame} from '../../TestGame';

describe('hasRevealedHiddenInformation', () => {
  it('treats drawing from the deck as hidden information', () => {
    const [game, player] = testGame(2, {skipInitialCardSelection: true});
    const restored = Game.deserialize(game.serialize(), {simulation: true});

    game.projectDeck.draw(game);

    expect(hasRevealedHiddenInformation(game, restored, player)).is.true;
  });

  it('does not treat adding a known card to the discard pile as a reveal', () => {
    const [game, player] = testGame(2, {skipInitialCardSelection: true});
    const restored = Game.deserialize(game.serialize(), {simulation: true});

    game.projectDeck.discard(new ArcticAlgae());

    expect(hasRevealedHiddenInformation(game, restored, player)).is.false;
  });

  it('treats revealing a card from the discard pile as hidden information', () => {
    const [game, player] = testGame(2, {skipInitialCardSelection: true});
    game.projectDeck.discard(new ArcticAlgae());
    const restored = Game.deserialize(game.serialize(), {simulation: true});

    game.projectDeck.discardPile.pop();

    expect(hasRevealedHiddenInformation(game, restored, player)).is.true;
  });

  it('treats shuffling the discard pile as hidden information', () => {
    const [game, player] = testGame(2, {skipInitialCardSelection: true});
    game.projectDeck.discard(new ArcticAlgae(), new BiomassCombustors());
    const restored = Game.deserialize(game.serialize(), {simulation: true});

    game.projectDeck.discardPile.reverse();

    expect(hasRevealedHiddenInformation(game, restored, player)).is.true;
  });

  it('does not treat the second standard project prompt as hidden information', () => {
    const [game, player] = testGame(2, {skipInitialCardSelection: true});
    const restored = Game.deserialize(game.serialize(), {simulation: true});
    player.setWaitingFor(new SelectStandardProjectToPlay(player, game.getStandardProjects(), {
      title: 'Select your second standard project',
    }));

    expect(hasRevealedHiddenInformation(game, restored, player)).is.false;
  });

  it('still treats an unknown project card prompt as hidden information', () => {
    const [game, player] = testGame(2, {skipInitialCardSelection: true});
    const restored = Game.deserialize(game.serialize(), {simulation: true});
    player.setWaitingFor(new SelectProjectCardToPlay(player, [new ArcticAlgae()]));

    expect(hasRevealedHiddenInformation(game, restored, player)).is.true;
  });
});

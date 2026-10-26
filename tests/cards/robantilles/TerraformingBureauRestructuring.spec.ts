import {expect} from 'chai';
import {TerraformingBureauRestructuring} from '../../../src/server/cards/robantilles/TerraformingBureauRestructuring';
import {RestrictedArea} from '../../../src/server/cards/base/RestrictedArea';
import {EquatorialMagnetizer} from '../../../src/server/cards/base/EquatorialMagnetizer';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, runAllActions, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Resource} from '../../../src/common/Resource';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {ICard} from '../../../src/server/cards/ICard';
import {cast} from '../../../src/common/utils/utils';

describe('TerraformingBureauRestructuring', () => {
  let card: TerraformingBureauRestructuring;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    card = new TerraformingBureauRestructuring();
    [game, player, opponent] = testGame(2, {turmoilExtension: true, robAntillesExpansion: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without the Bureaucrats ruling or 2 delegates there', () => {
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.BUREAUCRATS);
    expect(card.canPlay(player)).is.true;
  });

  it('does nothing when the opponent has no usable active cards', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    card.play(player);
    runAllActions(game);
    expect(player.getWaitingFor()).is.undefined;
  });

  it('marks 2 of an opponent\'s active cards as used, chosen by the acting player', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);

    const restrictedArea = new RestrictedArea();
    const equatorialMagnetizer = new EquatorialMagnetizer();
    opponent.megaCredits = 10;
    opponent.production.add(Resource.ENERGY, 1);
    opponent.playedCards.push(restrictedArea, equatorialMagnetizer);

    card.play(player);
    runAllActions(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard<ICard>);
    expect(selectCard.cards).has.lengthOf(2);
    selectCard.cb([restrictedArea, equatorialMagnetizer]);

    expect(opponent.actionsThisGeneration.has(restrictedArea.name)).is.true;
    expect(opponent.actionsThisGeneration.has(equatorialMagnetizer.name)).is.true;
  });
});

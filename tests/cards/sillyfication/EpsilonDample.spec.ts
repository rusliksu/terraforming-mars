import {expect} from 'chai';
import {EpsilonDample} from '../../../src/server/cards/sillyfication/EpsilonDample';
import {testGame} from '../../TestGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {Tag} from '../../../src/common/cards/Tag';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {DeltaProjectInput} from '../../../src/server/delta/DeltaProjectInput';
import {cast} from '../../../src/common/utils/utils';

describe('EpsilonDample', () => {
  let card: EpsilonDample;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new EpsilonDample();
    [game, player] = testGame(1, {deltaProjectExpansion: true});
  });

  it('has a Power tag and a Building tag', () => {
    expect(card.tags).to.deep.eq([Tag.POWER, Tag.BUILDING]);
  });

  it('starts with 29 M€, 9 steel, 3 energy, no energy production, and a second marker', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    expect(player.megaCredits).eq(29);
    expect(player.steel).eq(9);
    expect(player.energy).eq(3);
    expect(player.production.energy).eq(0);
    expect(player.epsilonDampleData).deep.eq({position: 0, jovianBonus: false});
  });

  it('cannot act with no energy and no position to retreat from', () => {
    player.playedCards.push(card);
    player.epsilonDampleData = {position: 0, jovianBonus: false};
    player.energy = 0;

    expect(card.canAct(player)).is.false;
  });

  it('offers only Advance when at the start with no way to retreat', () => {
    player.playedCards.push(card);
    player.epsilonDampleData = {position: 0, jovianBonus: false};
    player.energy = 3;
    // The corp's own Power/Building tags already cover positions 1-2; nothing covers
    // position 3 (Earth), so 2 steps is the furthest this can reach.
    const input = cast(card.action(player), DeltaProjectInput);
    expect(input.validSteps).deep.eq([1, 2]);
  });

  it('offers a choice of Advance or Move backward once there is somewhere to retreat to', () => {
    player.playedCards.push(card);
    player.epsilonDampleData = {position: 2, jovianBonus: false};
    player.energy = 3;
    player.playedCards.push(fakeCard({tags: [Tag.BUILDING, Tag.POWER, Tag.EARTH]}));

    const orOptions = cast(card.action(player), OrOptions);
    expect(orOptions.options.map((o) => o.title)).deep.eq(['Advance', 'Move backward']);
  });

  it('moving backward does not require tags and refunds no energy', () => {
    player.playedCards.push(card);
    player.epsilonDampleData = {position: 2, jovianBonus: false};
    player.energy = 5;

    // Nothing covers position 3 (Earth), so advancing isn't possible here - only
    // retreat is, which auto-resolves straight to the DeltaProjectInput.
    const input = cast(card.action(player), DeltaProjectInput);
    input.cb(2);

    expect(player.epsilonDampleData!.position).eq(0);
    expect(player.energy).eq(3);
  });

  it('cannot act once the marker is locked at a VP spot', () => {
    player.playedCards.push(card);
    player.epsilonDampleData = {position: 10, jovianBonus: false};
    player.energy = 10;

    expect(card.canAct(player)).is.false;
  });
});

import {expect} from 'chai';
import {
  EMPOWER_BONUS_1,
  EMPOWER_BONUS_2,
  EMPOWER_POLICY_1,
  EMPOWER_POLICY_3,
  EMPOWER_POLICY_4,
} from '../../../src/server/turmoil/parties/Empower';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, fakeCard} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';

describe('Empower', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.EMPOWER);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('bonus A: scores and grants 1 M€ per energy tag and per card with no tag', () => {
    expect(EMPOWER_BONUS_1.getScore(player)).to.eq(0);

    player.playedCards.push(fakeCard({tags: [Tag.EARTH, Tag.SPACE]})); // neither power nor tagless
    expect(EMPOWER_BONUS_1.getScore(player)).to.eq(0);

    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
    expect(EMPOWER_BONUS_1.getScore(player)).to.eq(1);

    player.playedCards.push(fakeCard({tags: []}));
    expect(EMPOWER_BONUS_1.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    EMPOWER_BONUS_1.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 2);
  });

  it('bonus B: scores and grants 1 M€ per energy production level', () => {
    player.production.override({energy: 3});
    expect(EMPOWER_BONUS_2.getScore(player)).to.eq(3);

    const before = player.megaCredits;
    EMPOWER_BONUS_2.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 3);
  });

  it('policy 2: gains 2 energy when energy production is raised or lowered', () => {
    setRulingParty(game, PartyName.EMPOWER, 'empp02');
    const before = player.energy;
    player.production.add(Resource.ENERGY, 1, {log: true});
    expect(player.energy).to.eq(before + 2);
  });

  it('policy 2: also fires when energy production is lowered', () => {
    player.production.override({energy: 3});
    setRulingParty(game, PartyName.EMPOWER, 'empp02');
    const before = player.energy;
    player.production.add(Resource.ENERGY, -1, {log: true});
    expect(player.energy).to.eq(before + 2);
  });

  it('policy 2: has no effect on non-energy production changes', () => {
    setRulingParty(game, PartyName.EMPOWER, 'empp02');
    const before = player.energy;
    player.production.add(Resource.HEAT, 1, {log: true});
    expect(player.energy).to.eq(before);
  });

  it('policy 3: applies +2 extra energy tags while active', () => {
    expect(player.tags.extraEnergyTags).to.eq(0);
    EMPOWER_POLICY_3.onPolicyStartForPlayer(player);
    expect(player.tags.extraEnergyTags).to.eq(2);
    expect(player.tags.count(Tag.POWER)).to.eq(2);
    EMPOWER_POLICY_3.onPolicyEndForPlayer(player);
    expect(player.tags.extraEnergyTags).to.eq(0);
  });

  it('policy 1: energy can be spent as M€ (2 M€ per energy) while active, not otherwise', () => {
    player.megaCredits = 3;
    player.energy = 2;
    expect(player.canAfford(5)).is.false;

    EMPOWER_POLICY_1.onPolicyStartForPlayer(player);
    expect(player.canAfford(5)).is.true; // 3 + 2*2 = 7

    EMPOWER_POLICY_1.onPolicyEndForPlayer(player);
    expect(player.canAfford(5)).is.false;
  });

  it('policy 4: choosing the energy tag (the only option) pays 4 M€ and draws an energy-tagged card', () => {
    player.megaCredits = 10;
    expect(EMPOWER_POLICY_4.canAct(player)).is.true;
    EMPOWER_POLICY_4.action(player);
    game.deferredActions.runAll(() => {});
    expect(player.megaCredits).to.eq(6);
    expect(player.cardsInHand).to.have.lengthOf(1);
    expect(player.cardsInHand[0].tags).to.include(Tag.POWER);
  });
});

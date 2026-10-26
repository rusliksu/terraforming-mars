import {expect} from 'chai';
import {IGame} from '../../src/server/IGame';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {DELTA_TRACK_TAGS, DeltaProjectExpansion, VP2_POSITION, VP5_POSITION} from '../../src/server/delta/DeltaProjectExpansion';
import {DeltaProject} from '../../src/server/cards/delta/DeltaProject';
import {Tag} from '../../src/common/cards/Tag';
import {fakeCard, runAllActions} from '../TestingUtils';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {DeltaProjectInput} from '../../src/server/delta/DeltaProjectInput';
import {SelectCard} from '../../src/server/inputs/SelectCard';
import {CardResource} from '../../src/common/CardResource';
import {CardName} from '../../src/common/cards/CardName';
import {SaturnSystems} from '../../src/server/cards/corporation/SaturnSystems';
import {Ringcom} from '../../src/server/cards/pathfinders/Ringcom';
import {SpaceRelay} from '../../src/server/cards/pathfinders/SpaceRelay';
import {RegolithEaters} from '../../src/server/cards/base/RegolithEaters';
import {VictoryPointsBreakdownBuilder} from '../../src/server/game/VictoryPointsBreakdownBuilder';
import {Game} from '../../src/server/Game';
import {GameCards} from '../../src/server/GameCards';
import {DEFAULT_GAME_OPTIONS} from '../../src/server/game/GameOptions';
import {cast} from '@/common/utils/utils';
import {IPlayer} from '@/server/IPlayer';

function playAllDeltaTrackTags(p: IPlayer) {
  p.playedCards.push(fakeCard({tags: DELTA_TRACK_TAGS.filter((t) => t !== undefined)}));
}

// Building + power + earth from start, so 3 steps to position 3 are legal.
function setupPlayerForThreeStepsFromStart(p: IPlayer) {
  p.energy = 3;
  p.playedCards.push(fakeCard({tags: [Tag.BUILDING, Tag.POWER, Tag.EARTH]}));
}

function prepareAdvanceFrom7To8(p: IPlayer) {
  playAllDeltaTrackTags(p);
  p.energy = 8;
  p.deltaProjectData!.position = 7;
}

function expectDeltaVp(player: IPlayer, expected: number) {
  const builder = new VictoryPointsBreakdownBuilder();
  DeltaProjectExpansion.calculateVictoryPoints(player, builder);
  expect(builder.build().victoryPoints).eq(expected);
}

describe('DeltaProjectExpansion', () => {
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    [game, player, player2] = testGame(2, {deltaProjectExpansion: true});
  });

  it('initializes player positions to 0', () => {
    expect(player.deltaProjectData!.position).eq(0);
    expect(player2.deltaProjectData!.position).eq(0);
  });

  describe('maxSteps', () => {
    it('limited by energy, or tags', () => {
      player.playedCards.push(
        fakeCard({tags: [Tag.BUILDING]}),
        fakeCard({tags: [Tag.POWER]}),
        fakeCard({tags: [Tag.EARTH]}),
      );
      player.energy = 1;
      expect(DeltaProjectExpansion.maxSteps(player)).eq(1);
      player.energy = 2;
      expect(DeltaProjectExpansion.maxSteps(player)).eq(2);
      player.energy = 3;
      expect(DeltaProjectExpansion.maxSteps(player)).eq(3);
      player.energy = 4;
      expect(DeltaProjectExpansion.maxSteps(player)).eq(3);
    });

    it('requires all prior tags', () => {
      player.playedCards.push(
        fakeCard({tags: [Tag.BUILDING]}),
        fakeCard({tags: [Tag.EARTH]}),
      );
      player.energy = 10;
      // Missing power tag at position 2, so can only reach 1
      expect(DeltaProjectExpansion.maxSteps(player)).eq(1);
    });

    it('wild tags fill missing tags', () => {
      player.playedCards.push(
        fakeCard({tags: [Tag.BUILDING]}),
        fakeCard({tags: [Tag.WILD]}),
        fakeCard({tags: [Tag.EARTH]}),
      );
      player.energy = 10;
      // Wild fills missing power tag → can reach 3
      expect(DeltaProjectExpansion.maxSteps(player)).eq(3);
    });

    it('multiple wilds cover multiple gaps', () => {
      player.playedCards.push(
        fakeCard({tags: [Tag.WILD]}),
        fakeCard({tags: [Tag.WILD]}),
      );
      player.energy = 10;
      // Two wilds cover building + power → can reach 2
      expect(DeltaProjectExpansion.maxSteps(player)).eq(2);
    });

    it('skips claimed 2VP spot', () => {
      playAllDeltaTrackTags(player);
      player.energy = 20;
      player.deltaProjectData!.position = 9;
      player2.deltaProjectData!.position = 10;

      // 2VP (pos 10) is occupied, skip to 5VP (pos 11) → 2 steps
      expect(DeltaProjectExpansion.maxSteps(player)).eq(2);
    });

    it('stops at claimed 5VP spot', () => {
      playAllDeltaTrackTags(player);
      player.energy = 20;
      player.deltaProjectData!.position = 9;
      player2.deltaProjectData!.position = 11;

      // Can reach 2VP (pos 10) but 5VP is blocked
      expect(DeltaProjectExpansion.maxSteps(player)).eq(1);
    });

    it('returns 0 at end of track', () => {
      player.deltaProjectData!.position = 11;
      player.energy = 10;
      expect(DeltaProjectExpansion.maxSteps(player)).eq(0);
    });
  });

  describe('advance', () => {
    it('deducts energy and updates position', () => {
      player.energy = 5;
      playAllDeltaTrackTags(player);

      DeltaProjectExpansion.advance(player, 3);

      expect(player.energy).eq(2);
      expect(player.deltaProjectData!.position).eq(3);
    });

    it('reaches position 10 (2VP spot)', () => {
      player.energy = 5;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 9;

      DeltaProjectExpansion.advance(player, 1);

      expect(player.deltaProjectData!.position).eq(VP2_POSITION);
    });

    it('reaches position 11 (5VP spot) from position 10', () => {
      player.energy = 5;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 10;

      DeltaProjectExpansion.advance(player, 1);

      expect(player.deltaProjectData!.position).eq(VP5_POSITION);
    });

    it('reaches position 11 when skipping past position 10', () => {
      player.energy = 5;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 9;

      DeltaProjectExpansion.advance(player, 2);

      expect(player.deltaProjectData!.position).eq(VP5_POSITION);
    });

    it('throws on out-of-range step count', () => {
      player.energy = 100;
      playAllDeltaTrackTags(player);

      expect(() => DeltaProjectExpansion.advance(player, 100)).to.throw();
      expect(() => DeltaProjectExpansion.advance(player, 0)).to.throw();
      expect(() => DeltaProjectExpansion.advance(player, -1)).to.throw();
    });
  });

  describe('reward resolution', () => {
    it('position 1: choose 2 steel or 2 plants', () => {
      player.energy = 1;
      playAllDeltaTrackTags(player);
      DeltaProjectExpansion.advance(player, 1);
      runAllActions(game);

      const orOptions = cast(player.popWaitingFor(), OrOptions);
      orOptions.options[0].cb();
      expect(player.steel).eq(2);
    });

    it('position 2: choose energy or heat production', () => {
      player.energy = 2;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 1;

      DeltaProjectExpansion.advance(player, 1);
      runAllActions(game);

      const orOptions = cast(player.popWaitingFor(), OrOptions);
      orOptions.options[1].cb();
      expect(player.production.heat).eq(1);
    });

    it('position 3: +2 MC production', () => {
      player.energy = 3;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 2;

      DeltaProjectExpansion.advance(player, 1);

      expect(player.production.megacredits).eq(2);
    });

    it('position 4: +1 titanium production', () => {
      player.energy = 4;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 3;

      DeltaProjectExpansion.advance(player, 1);

      expect(player.production.titanium).eq(1);
    });

    it('position 5: draw 4, keep 2', () => {
      player.energy = 5;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 4;

      DeltaProjectExpansion.advance(player, 1);
      runAllActions(game);

      const selectCard = cast(player.popWaitingFor(), SelectCard);
      expect(selectCard.cards.length).eq(4);
      selectCard.cb([selectCard.cards[0], selectCard.cards[1]]);
      expect(player.cardsInHand.length).eq(2);
    });

    it('position 6: gain plants per plant tag', () => {
      player.energy = 6;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 5;
      player.playedCards.push(
        fakeCard({tags: [Tag.PLANT]}),
        fakeCard({tags: [Tag.PLANT]}),
        fakeCard({tags: [Tag.PLANT]}),
      );

      DeltaProjectExpansion.advance(player, 1);

      expect(player.plants).gte(3);
    });

    it('position 7: reuse a used blue card action', () => {
      player.energy = 7;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 6;

      const regolith = new RegolithEaters();
      player.playedCards.push(regolith);
      player.actionsThisGeneration.add(CardName.REGOLITH_EATERS);

      DeltaProjectExpansion.advance(player, 1);
      runAllActions(game);

      const selectCard = cast(player.popWaitingFor(), SelectCard);
      expect(selectCard.cards).includes(regolith);
      selectCard.cb([regolith]);
      runAllActions(game);

      expect(regolith.resourceCount).eq(1);
    });

    it('position 7: no action if no used blue cards', () => {
      player.energy = 7;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 6;

      DeltaProjectExpansion.advance(player, 1);
      runAllActions(game);

      expect(player.popWaitingFor()).is.undefined;
    });

    it('position 8: grants jovian tag', () => {
      player.energy = 8;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 7;

      const joviansBefore = player.tags.count(Tag.JOVIAN, 'raw');
      DeltaProjectExpansion.advance(player, 1);

      expect(player.tags.extraJovianTags).eq(1);
      expect(player.tags.count(Tag.JOVIAN, 'raw')).eq(joviansBefore + 1);
      expect(player.deltaProjectData!.jovianBonus).is.true;
    });

    it('position 8: jovian tag not granted twice', () => {
      player.energy = 10;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 7;
      player.deltaProjectData!.jovianBonus = true;
      player.tags.extraJovianTags = 1;

      DeltaProjectExpansion.advance(player, 1);

      expect(player.tags.extraJovianTags).eq(1);
    });

    it('position 8: does not grant jovian tag when skipped', () => {
      player.energy = 10;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 7;

      DeltaProjectExpansion.advance(player, 2);

      expect(player.tags.extraJovianTags).eq(0);
      expect(player.deltaProjectData!.jovianBonus).is.false;
    });

    it('position 9: add 2 animals to a card', () => {
      player.energy = 9;
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 8;
      const animalCard = fakeCard({resourceType: CardResource.ANIMAL, name: 'AnimalHost' as CardName});
      player.playedCards.push(animalCard);

      DeltaProjectExpansion.advance(player, 1);
      runAllActions(game);

      expect(animalCard.resourceCount).eq(2);
    });

    it('only resolves reward for landing position, not intermediate', () => {
      player.energy = 3;
      playAllDeltaTrackTags(player);

      DeltaProjectExpansion.advance(player, 3);

      // Position 3 gives +2 MC production; positions 1 and 2 are skipped
      expect(player.production.megacredits).eq(2);
      expect(player.steel).eq(0);
    });
  });

  describe('VP scoring', () => {
    it('awards 2VP for 2VP spot', () => {
      player.deltaProjectData!.position = VP2_POSITION;

      expectDeltaVp(player, 2);
    });

    it('awards 5VP for 5VP spot', () => {
      player.deltaProjectData!.position = VP5_POSITION;

      expectDeltaVp(player, 5);
    });

    it('5VP is not additive with 2VP', () => {
      player.deltaProjectData!.position = VP5_POSITION;

      expectDeltaVp(player, 5);
    });

    it('no VP if not on a VP spot', () => {
      expectDeltaVp(player, 0);
    });
  });

  describe('VP spot contention', () => {
    it('rejects advance onto position 10 while another player occupies it', () => {
      playAllDeltaTrackTags(player);
      playAllDeltaTrackTags(player2);
      player.deltaProjectData!.position = 10;
      player2.deltaProjectData!.position = 9;
      player2.energy = 5;

      expect(() => DeltaProjectExpansion.advance(player2, 1)).to.throw();
    });

    it('only one player can reach position 10', () => {
      player.deltaProjectData!.position = VP2_POSITION;

      player2.energy = 10;
      playAllDeltaTrackTags(player2);
      player2.deltaProjectData!.position = 9;

      expect(DeltaProjectExpansion.maxSteps(player2)).eq(2);
      expect(player2.deltaProjectData!.position).eq(9);
    });

    it('player can overtake position 10 to reach position 11', () => {
      player.deltaProjectData!.position = VP2_POSITION;
      player2.deltaProjectData!.position = VP2_POSITION - 1;
      player2.energy = 10;

      playAllDeltaTrackTags(player2);

      DeltaProjectExpansion.advance(player2, 2);

      expect(player2.deltaProjectData!.position).eq(VP5_POSITION);
    });

    it('position 10 is freed when holder advances to position 11', () => {
      player.deltaProjectData!.position = VP2_POSITION;
      player.energy = 10;
      playAllDeltaTrackTags(player);

      DeltaProjectExpansion.advance(player, 1);

      expect(player.deltaProjectData!.position).eq(VP5_POSITION);

      player2.deltaProjectData!.position = VP2_POSITION - 1;
      player2.energy = 10;
      playAllDeltaTrackTags(player2);

      DeltaProjectExpansion.advance(player2, 1);

      expect(player2.deltaProjectData!.position).eq(VP2_POSITION);
    });
  });

  describe('jovian tag card callbacks', () => {
    it('triggers Saturn Systems for the card owner', () => {
      const saturnSystems = new SaturnSystems();
      prepareAdvanceFrom7To8(player);
      player.playedCards.push(saturnSystems);

      player.production.megacredits = 0;
      DeltaProjectExpansion.advance(player, 1);

      expect(player.production.megacredits).eq(1);
    });

    it('triggers Saturn Systems for other players', () => {
      const saturnSystems = new SaturnSystems();
      prepareAdvanceFrom7To8(player);
      player2.playedCards.push(saturnSystems);

      player2.production.megacredits = 0;
      DeltaProjectExpansion.advance(player, 1);

      expect(player2.production.megacredits).eq(1);
    });

    it('does not trigger Ringcom', () => {
      const ringcom = new Ringcom();
      prepareAdvanceFrom7To8(player);
      player2.playedCards.push(ringcom);

      player2.titanium = 0;
      DeltaProjectExpansion.advance(player, 1);

      expect(player2.titanium).eq(0);
    });

    it('does not raise the Pathfinders Jovian track', () => {
      const [game, player] = testGame(2, {deltaProjectExpansion: true, pathfindersExpansion: true});
      prepareAdvanceFrom7To8(player);

      expect(game.pathfindersData!.jovian).eq(0);
      DeltaProjectExpansion.advance(player, 1);

      expect(game.pathfindersData!.jovian).eq(0);
    });

    it('does not trigger SpaceRelay', () => {
      const spaceRelay = new SpaceRelay();
      prepareAdvanceFrom7To8(player);
      player.playedCards.push(spaceRelay);

      player.cardsInHand.length = 0;
      DeltaProjectExpansion.advance(player, 1);

      expect(player.cardsInHand.length).eq(0);
    });
  });

  describe('prelude card', () => {
    it('is added to prelude hand when expansion is enabled', () => {
      expect(player.preludeCardsInHand.some((c) => c.name === CardName.DELTA_PROJECT)).is.true;
    });

    it('is not present when expansion is disabled', () => {
      const [/* game */, p] = testGame(1);
      expect(p.preludeCardsInHand.some((c) => c.name === CardName.DELTA_PROJECT)).is.false;
    });

    it('is not drawable from the normal prelude pool - it is only ever force-dealt', () => {
      // Regression: it used to also sit in the shared prelude deck, so besides every
      // player getting it for free, it could also be drawn (and end up duplicated, or
      // taking up a slot meant for a real prelude) through the normal prelude draft.
      const gameCards = new GameCards({...DEFAULT_GAME_OPTIONS, preludeExtension: true, deltaProjectExpansion: true});
      const pool = gameCards.getPreludeCards();
      expect(pool.some((c) => c.name === CardName.DELTA_PROJECT)).is.false;
    });

    it('canAct returns false with no energy', () => {
      const card = new DeltaProject();
      player.energy = 0;
      player.playedCards.push(fakeCard({tags: [Tag.BUILDING]}));
      expect(card.canAct(player)).is.false;
    });

    it('canAct returns false when no tags to advance', () => {
      const card = new DeltaProject();
      player.energy = 5;
      expect(card.canAct(player)).is.false;
    });

    it('canAct returns true when can advance', () => {
      const card = new DeltaProject();
      player.energy = 5;
      player.playedCards.push(fakeCard({tags: [Tag.BUILDING]}));
      expect(card.canAct(player)).is.true;
    });

    it('action returns DeltaProjectInput with valid step list', () => {
      const card = new DeltaProject();
      setupPlayerForThreeStepsFromStart(player);

      const input = cast(card.action(player), DeltaProjectInput);
      expect(input.validSteps).deep.eq([1, 2, 3]);
    });

    it('action advances the player on the track', () => {
      const card = new DeltaProject();
      setupPlayerForThreeStepsFromStart(player);

      const input = cast(card.action(player), DeltaProjectInput);
      input.cb(2);

      expect(player.deltaProjectData!.position).eq(2);
      expect(player.energy).eq(1);
    });
  });

  describe('serialization', () => {
    it('round-trips delta project progress through player serialization', () => {
      player.deltaProjectData!.position = 5;
      player.deltaProjectData!.jovianBonus = true;
      player2.deltaProjectData!.position = 10;
      player.tags.extraJovianTags = 1;

      const serialized = game.serialize();
      const serializedPlayer = serialized.players.find((p) => p.color === player.color)!;
      const serializedPlayer2 = serialized.players.find((p) => p.color === player2.color)!;
      expect(serializedPlayer.deltaProject).deep.eq({position: 5, jovianBonus: true});
      expect(serializedPlayer2.deltaProject).deep.eq({position: 10, jovianBonus: false});
    });

    it('full deserialization round-trip preserves delta project progress', () => {
      player.deltaProjectData!.position = 7;
      player.deltaProjectData!.jovianBonus = true;
      player2.deltaProjectData!.position = 10;

      const restored = Game.deserialize(game.serialize());

      const p1 = restored.getPlayerById(player.id).deltaProjectData!;
      expect(p1.position).eq(7);
      expect(p1.jovianBonus).is.true;

      const p2 = restored.getPlayerById(player2.id).deltaProjectData!;
      expect(p2.position).eq(10);
      expect(p2.jovianBonus).is.false;
    });
  });

  describe('Epsilon Dample second marker', () => {
    beforeEach(() => {
      player.epsilonDampleData = {position: 0, jovianBonus: false};
    });

    it('advances independently of the primary marker', () => {
      setupPlayerForThreeStepsFromStart(player);
      player.deltaProjectData!.position = 0;

      DeltaProjectExpansion.advanceEpsilon(player, 3);

      expect(player.epsilonDampleData!.position).eq(3);
      expect(player.deltaProjectData!.position).eq(0);
    });

    it('grants the landing reward, same as the primary marker', () => {
      setupPlayerForThreeStepsFromStart(player);

      DeltaProjectExpansion.advanceEpsilon(player, 3);
      runAllActions(game);

      expect(player.production.megacredits).eq(2); // position 3: Earth tag reward
    });

    it('both markers can independently grant a Jovian tag at position 8', () => {
      prepareAdvanceFrom7To8(player);

      DeltaProjectExpansion.advance(player, 1);
      expect(player.tags.extraJovianTags).eq(1);

      player.energy = 8;
      DeltaProjectExpansion.advanceEpsilon(player, 8);
      expect(player.tags.extraJovianTags).eq(2);
    });

    it('the Jovian tag itself is still one-time per marker, even though other rewards can be farmed', () => {
      playAllDeltaTrackTags(player);
      player.epsilonDampleData!.position = 8;
      player.energy = 4;

      DeltaProjectExpansion.retreatEpsilon(player, 1); // position 7
      player.energy = 1;
      DeltaProjectExpansion.advanceEpsilon(player, 1); // back to position 8 - already have the tag
      player.energy = 1;
      DeltaProjectExpansion.retreatEpsilon(player, 1); // position 7 again
      player.energy = 1;
      DeltaProjectExpansion.advanceEpsilon(player, 1); // position 8 again

      expect(player.tags.extraJovianTags).eq(1);
    });

    it('retreating does not require tags, and grants the landing reward', () => {
      player.epsilonDampleData!.position = 5;
      player.energy = 5;
      player.production.override({megacredits: 0});

      DeltaProjectExpansion.retreatEpsilon(player, 2);

      expect(player.epsilonDampleData!.position).eq(3);
      expect(player.energy).eq(3);
      expect(player.production.megacredits).eq(2);
    });

    it('re-landing on the same position grants its reward again - shuttling back and forth farms rewards', () => {
      playAllDeltaTrackTags(player);
      player.energy = 4;
      player.production.override({titanium: 0});

      DeltaProjectExpansion.advanceEpsilon(player, 4); // straight to position 4 (Space)
      runAllActions(game);
      expect(player.production.titanium).eq(1);

      player.energy = 1;
      DeltaProjectExpansion.retreatEpsilon(player, 1); // position 3 (Earth)
      runAllActions(game);

      player.energy = 1;
      DeltaProjectExpansion.advanceEpsilon(player, 1); // back to position 4 (Space) - again
      runAllActions(game);

      // Position 4's reward fired both times this marker landed there.
      expect(player.production.titanium).eq(2);
    });

    it('advancing to a new position triggers its reward', () => {
      setupPlayerForThreeStepsFromStart(player);
      DeltaProjectExpansion.advanceEpsilon(player, 3);
      runAllActions(game);

      player.energy = 1;
      player.playedCards.push(fakeCard({tags: [Tag.SPACE]}));
      DeltaProjectExpansion.advanceEpsilon(player, 1);
      runAllActions(game);

      expect(player.production.titanium).eq(1); // position 4: Space tag reward
    });

    it('cannot retreat below position 0', () => {
      player.epsilonDampleData!.position = 1;
      player.energy = 5;

      expect(DeltaProjectExpansion.getValidEpsilonRetreatSteps(player)).deep.eq([1]);
    });

    it('a player cannot stack both of their own markers on the same VP spot', () => {
      playAllDeltaTrackTags(player);
      player.energy = 20;
      player.deltaProjectData!.position = 9;
      player.epsilonDampleData!.position = 9;

      DeltaProjectExpansion.advance(player, 1);
      expect(player.deltaProjectData!.position).eq(VP2_POSITION);

      const steps = DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player);
      expect(steps).to.not.include(1);
    });

    it('VP from the two markers does not stack - takes the higher of the two', () => {
      player.deltaProjectData!.position = VP2_POSITION;
      player.epsilonDampleData!.position = VP5_POSITION;

      expectDeltaVp(player, 5);
    });

    it('locks in place at the 2VP spot - no further advance or retreat', () => {
      player.epsilonDampleData!.position = VP2_POSITION;
      player.energy = 10;

      expect(DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player)).deep.eq([]);
      expect(DeltaProjectExpansion.getValidEpsilonRetreatSteps(player)).deep.eq([]);
    });

    it('locks in place at the 5VP spot - no further retreat', () => {
      player.epsilonDampleData!.position = VP5_POSITION;
      player.energy = 10;

      expect(DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player)).deep.eq([]);
      expect(DeltaProjectExpansion.getValidEpsilonRetreatSteps(player)).deep.eq([]);
    });

    it('reaching the 2VP spot locks the marker there immediately', () => {
      playAllDeltaTrackTags(player);
      player.epsilonDampleData!.position = 9;
      player.energy = 10;

      DeltaProjectExpansion.advanceEpsilon(player, 1);

      expect(player.epsilonDampleData!.position).eq(VP2_POSITION);
      expect(DeltaProjectExpansion.getValidEpsilonAdvanceSteps(player)).deep.eq([]);
      expect(DeltaProjectExpansion.getValidEpsilonRetreatSteps(player)).deep.eq([]);
    });

    it('the primary marker is unaffected by the VP-lock and can still advance from 2VP to 5VP', () => {
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = VP2_POSITION;
      player.energy = 10;

      expect(DeltaProjectExpansion.getValidAdvanceSteps(player)).deep.eq([1]);
    });
  });

  describe('Zeta Tollkeeper', () => {
    beforeEach(() => {
      player.playedCards.push(fakeCard({name: CardName.ZETA_TOLLKEEPER}));
    });

    it('does not affect getValidAdvanceSteps, and buildAdvanceInput is just the plain step input', () => {
      playAllDeltaTrackTags(player);
      player.energy = 2;
      expect(DeltaProjectExpansion.getValidAdvanceSteps(player)).deep.eq([1, 2]);

      const stepInput = cast(DeltaProjectExpansion.buildAdvanceInput(player), DeltaProjectInput);
      expect(stepInput.validSteps).deep.eq([1, 2]);
    });

    it('advancing only grants the landing position reward, not every earlier one', () => {
      playAllDeltaTrackTags(player);
      player.deltaProjectData!.position = 3; // already past positions 1-3 by some other means
      player.energy = 2;
      player.production.override({titanium: 0});

      DeltaProjectExpansion.advance(player, 1); // to position 4 (Space) - a single step

      expect(player.production.titanium).eq(1);
      // No queued rewards for the earlier positions - that multiplier is gone.
      expect(game.deferredActions).has.lengthOf(0);
    });
  });
});

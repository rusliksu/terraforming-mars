import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {DutchMountains} from '../../../src/server/cards/delta/DutchMountains';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('DutchMountains', () => {
  let card: DutchMountains;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DutchMountains();
    [/* game */, player] = testGame(2, {deltaProjectExpansion: true});
  });

  it('cannot play with fewer than 4 Delta Project steps taken', () => {
    player.deltaProjectData!.position = 3;
    expect(card.canPlay(player)).is.false;
    player.deltaProjectData!.position = 4;
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without 3 energy', () => {
    player.deltaProjectData!.position = 4;
    player.energy = 2;
    expect(card.canAct(player)).is.false;
  });

  it('re-triggers a passed position\'s reward for 3 energy', () => {
    player.playedCards.push(card);
    player.deltaProjectData!.position = 4; // passed Earth (position 3)
    player.energy = 3;
    player.production.override({megacredits: 0});

    const orOptions = cast(card.action(player), OrOptions);
    // Positions 1-4 (Building, Power, Earth, Space) are all eligible at position 4.
    expect(orOptions.options).has.length(4);
    const earthOption = orOptions.options.find((o) => o.title.toString().includes('earth'))!;
    earthOption.cb(undefined);

    expect(player.energy).eq(0);
    expect(player.production.megacredits).eq(2);
  });

  it('excludes the Jovian step', () => {
    player.playedCards.push(card);
    player.deltaProjectData!.position = 9;
    player.energy = 3;

    const orOptions = cast(card.action(player), OrOptions);
    expect(orOptions.options.map((o) => o.title.toString())).to.not.include.members(['Re-trigger the jovian bonus (step 8)']);
    expect(orOptions.options).has.length(8); // positions 1-7, 9
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});

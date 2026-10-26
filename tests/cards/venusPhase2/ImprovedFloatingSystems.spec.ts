import {expect} from 'chai';
import {ImprovedFloatingSystems} from '../../../src/server/cards/venusPhase2/ImprovedFloatingSystems';
import {CloudCityStandardProject} from '../../../src/server/cards/venusPhase2/CloudCityStandardProject';
import {AsteroidStandardProject} from '../../../src/server/cards/base/standardProjects/AsteroidStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('ImprovedFloatingSystems', () => {
  let card: ImprovedFloatingSystems;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ImprovedFloatingSystems();
    [/* game */, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('requires a Science tag', () => {
    expect(card.canPlay(player)).is.false;
    player.tags.extraScienceTags = 1;
    expect(card.canPlay(player)).is.true;
  });

  it('gains 3 M€ when paying for a Venus standard project', () => {
    card.onStandardProject(player, new CloudCityStandardProject());
    expect(player.megaCredits).to.eq(3);
  });

  it('does not react to non-Venus standard projects', () => {
    card.onStandardProject(player, new AsteroidStandardProject());
    expect(player.megaCredits).to.eq(0);
  });
});

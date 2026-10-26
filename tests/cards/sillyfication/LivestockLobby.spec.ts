import {expect} from 'chai';
import {LivestockLobby} from '../../../src/server/cards/sillyfication/LivestockLobby';
import {Fish} from '../../../src/server/cards/base/Fish';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('LivestockLobby', () => {
  let card: LivestockLobby;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new LivestockLobby();
    [/* game */, player, player2] = testGame(2);
    player.playedCards.push(card);
    player.megaCredits = 0;
    player2.plants = 0;
  });

  it('another player adding an animal gains that player plants only, no M€ for the owner', () => {
    const fish = new Fish();
    player2.playedCards.push(fish);

    player2.addResourceTo(fish, 2);

    expect(player2.plants).to.eq(2);
    expect(player.megaCredits).to.eq(0);
  });

  it('the owner adding an animal gains both plants and M€', () => {
    const fish = new Fish();
    player.playedCards.push(fish);
    player.megaCredits = 0;
    player.plants = 0;

    player.addResourceTo(fish, 1);

    expect(player.megaCredits).to.eq(1);
    expect(player.plants).to.eq(1);
  });

  it('ignores non-animal resources', () => {
    const microbeCard = new Tardigrades();
    player.playedCards.push(microbeCard);

    player2.addResourceTo(microbeCard, 3);

    expect(player.megaCredits).to.eq(0);
    expect(player2.plants).to.eq(0);
  });

  it('requires 2 animal tags and plant production to reduce', () => {
    player.megaCredits = 20;
    player.production.override({plants: 1});
    player.tagsForTest = {animal: 1};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {animal: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('play decreases your plant production 1 step', () => {
    player.production.override({plants: 2});
    card.play(player);
    expect(player.production.plants).to.eq(1);
  });
});

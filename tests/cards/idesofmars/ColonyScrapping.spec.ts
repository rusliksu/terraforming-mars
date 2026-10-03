import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {ColonyScrapping} from '../../../src/server/cards/idesofmars/ColonyScrapping';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {cast} from '../../../src/common/utils/utils';

describe('ColonyScrapping', () => {
  let card: ColonyScrapping;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ColonyScrapping();
    [game, player] = testGame(1, {coloniesExtension: true});
  });

  it('requires owning at least 1 colony', () => {
    expect(card.canPlay(player)).is.false;

    game.colonies[0].colonies.push(player.id);
    expect(card.canPlay(player)).is.true;
  });

  it('removes 1 of the player\'s colonies and grants 12 M€', () => {
    const colony = game.colonies[0];
    colony.colonies.push(player.id);
    const startingMegacredits = player.megaCredits;

    const selectColony = cast(card.play(player), SelectColony);
    selectColony.cb(colony);

    expect(colony.colonies).to.not.contain(player.id);
    expect(player.megaCredits).to.eq(startingMegacredits + 12);
  });

  it('only offers colonies the player actually owns', () => {
    const [game2, player1, player2] = testGame(2, {coloniesExtension: true});
    const ownedColony = game2.colonies[0];
    const otherColony = game2.colonies[1];
    ownedColony.colonies.push(player1.id);
    otherColony.colonies.push(player2.id);

    const selectColony = cast(card.play(player1), SelectColony);
    expect(selectColony.colonies).to.deep.eq([ownedColony]);
  });
});

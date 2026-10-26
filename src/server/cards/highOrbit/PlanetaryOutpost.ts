import {CardName} from '../../../common/cards/CardName';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {IProjectCard} from '../IProjectCard';
import {IPlayer, CanAffordOptions} from '../../IPlayer';
import {Card} from '../Card';

/**
 * High Orbit (fan): Planetary Outpost. It's still a Silver/Infrastructure-style card -- paid
 * the same native-Titanium way as the other 17 designs (see
 * Player.getHighOrbitInfrastructureOptions) -- but unlike them it carries the Building tag
 * (not Infrastructure) and has no Space>Infrastructure requirement, an explicit exception in
 * the source material. It still comes from the same shared market (see IGame.highOrbitMarket),
 * so it keeps its own tableau-duplicate guard (vanilla Terraforming Mars never needed this
 * since a CardName was always unique in the deck).
 *
 * On play: become the first player. Only one copy of Planetary Outpost can be played per
 * generation, across all players -- since several separate physical copies exist in the shared
 * supply, that constraint can't be tracked on a single card instance. Instead it's tracked
 * game-wide, by CardName, in `IGame.cardsPlayedThisGeneration` (see Game.ts, reset each
 * generation in `startGeneration`).
 *
 * No VP on this card -- the source material shows an ambiguous icon but no confirming VP text.
 */
export class PlanetaryOutpost extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PLANETARY_OUTPOST,
      tags: [Tag.BUILDING],
      cost: 4,

      metadata: {
        cardNumber: 'HO06',
        renderData: CardRenderer.builder((b) => {
          b.firstPlayer().br;
          b.text('Only 1 Planetary Outpost may be played per generation.', {size: Size.SMALL});
        }),
        description: 'Become the first player.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, _canAffordOptions: CanAffordOptions): boolean {
    if (player.tableau.has(this.name)) {
      return false;
    }
    return !player.game.cardsPlayedThisGeneration.has(this.name);
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.cardsPlayedThisGeneration.add(this.name);
    game.overrideFirstPlayer(player);
    game.log('${0} played ${1} and became the first player', (b) => b.player(player).card(this));
    return undefined;
  }
}

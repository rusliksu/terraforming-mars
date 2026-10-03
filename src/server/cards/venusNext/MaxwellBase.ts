import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {SpaceName} from '../../../common/boards/SpaceName';
import {IActionCard} from '../ICard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {VENUS_MAXWELL_BASE} from '../../venusPhase2/VenusSurfaceBoard';

export class MaxwellBase extends ActionCard implements IActionCard {
  constructor() {
    super({
      name: CardName.MAXWELL_BASE,
      type: CardType.ACTIVE,
      tags: [Tag.CITY, Tag.VENUS],
      cost: 18,

      action: {
        addResourcesToAnyCard: {
          tag: Tag.VENUS,
          count: 1,
          autoSelect: true,
          mustHaveCard: true,
        },
      },

      requirements: {venus: 12},
      victoryPoints: 3,
      behavior: {
        production: {energy: -1},
        // See bespokeCanPlay/bespokePlay below -- the city placement is bespoke, not
        // declarative, so it can target the Venus surface board once Venus Phase 2 is enabled.
      },

      metadata: {
        cardNumber: '238',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 resource to ANOTHER VENUS CARD.', (eb) => {
            eb.empty().startAction.wild(1, {secondaryTag: Tag.VENUS});
          }).br;
          b.production((pb) => pb.minus().energy(1)).nbsp.city().asterix();
        }),
        description: {
          text: 'Requires Venus 12%. Decrease your energy production 1 step. Place a city tile ON THE RESERVED AREA.',
          align: 'left',
        },
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, _canAffordOptions: CanAffordOptions): boolean {
    if (player.game.gameOptions.venusPhase2Expansion) {
      const venusSurface = VenusPhase2Expansion.venusPhase2Data(player.game).venusSurface;
      return venusSurface.getSpaceOrThrow(VENUS_MAXWELL_BASE).tile === undefined;
    }
    return player.game.board.getSpaceOrThrow(SpaceName.MAXWELL_BASE).tile === undefined;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    if (player.game.gameOptions.venusPhase2Expansion) {
      VenusPhase2Expansion.addReservedCityTile(player, VENUS_MAXWELL_BASE, this.name);
      return undefined;
    }
    const space = player.game.board.getSpaceOrThrow(SpaceName.MAXWELL_BASE);
    player.game.addCity(player, space);
    if (space.tile !== undefined) { // Should never be undefined
      space.tile.card = this.name;
    }
    return undefined;
  }
}

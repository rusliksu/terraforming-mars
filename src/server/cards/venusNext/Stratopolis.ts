import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {SpaceName} from '../../../common/boards/SpaceName';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {VENUS_STRATOPOLIS} from '../../venusPhase2/VenusSurfaceBoard';

export class Stratopolis extends ActionCard {
  constructor() {
    super({
      name: CardName.STRATOPOLIS,
      type: CardType.ACTIVE,
      tags: [Tag.CITY, Tag.VENUS],
      cost: 22,

      resourceType: CardResource.FLOATER,
      victoryPoints: {resourcesHere: {}, per: 3},
      requirements: {tag: Tag.SCIENCE, count: 2},

      behavior: {
        production: {megacredits: 2},
        // The city placement is handled bespoke (see bespokeCanPlay/bespokePlay below), not
        // declaratively here -- with Venus Phase 2 enabled, this reserved spot lives on the
        // Venus surface board, not Mars, and the declarative `city` behavior can only ever
        // resolve a fixed space against the Mars board.
      },

      action: {
        addResourcesToAnyCard: {
          count: 2,
          tag: Tag.VENUS,
          type: CardResource.FLOATER,
          autoSelect: true,
        },
      },

      metadata: {
        cardNumber: '248',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 2 floaters to ANY VENUS CARD.', (eb) => {
            eb.empty().startAction.resource(CardResource.FLOATER, {amount: 2, secondaryTag: Tag.VENUS});
          }).br;
          b.production((pb) => pb.megacredits(2)).city().asterix();
          b.vpText('1 VP for every 3rd Floater on this card.');
        }),
        description: {
          text: 'Requires 2 science tags. Increase your M€ production 2 steps. Place a city tile ON THE RESERVED AREA',
          align: 'left',
        },
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer, _canAffordOptions: CanAffordOptions): boolean {
    if (player.game.gameOptions.venusPhase2Expansion) {
      const venusSurface = VenusPhase2Expansion.venusPhase2Data(player.game).venusSurface;
      return venusSurface.getSpaceOrThrow(VENUS_STRATOPOLIS).tile === undefined;
    }
    return player.game.board.getSpaceOrThrow(SpaceName.STRATOPOLIS).tile === undefined;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    if (player.game.gameOptions.venusPhase2Expansion) {
      VenusPhase2Expansion.addReservedCityTile(player, VENUS_STRATOPOLIS, this.name);
      return undefined;
    }
    const space = player.game.board.getSpaceOrThrow(SpaceName.STRATOPOLIS);
    player.game.addCity(player, space);
    if (space.tile !== undefined) { // Should never be undefined
      space.tile.card = this.name;
    }
    return undefined;
  }
}

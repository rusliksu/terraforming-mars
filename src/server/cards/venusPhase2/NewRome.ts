import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceCloudCityTile} from '../../venusPhase2/PlaceCloudCityTile';
import {TileType} from '../../../common/TileType';
import {Turmoil} from '../../turmoil/Turmoil';
import {SelectParty} from '../../inputs/SelectParty';
import {toName} from '../../../common/utils/utils';

export class NewRome extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.NEW_ROME,
      tags: [Tag.CITY, Tag.VENUS],
      cost: 16,
      requirements: {venus: 16},

      behavior: {
        global: {venus: 1},
      },

      action: {},

      metadata: {
        cardNumber: 'V91',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.VENUS_CLOUD_CITY).venus(1);
          b.br;
          b.action('Add a delegate to a party you lead.', (eb) => {
            eb.empty().startAction.delegates(1);
          });
        }),
        description: 'Requires Venus 16% or more. Place a Venus Habitat and raise Venus 1 step.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    return data.venusSurface.getAvailableSpacesForLand(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceCloudCityTile(player, undefined, 'Select a space on the Venus surface for a Venus Habitat.'));
    return undefined;
  }

  private ledParties(player: IPlayer) {
    return Turmoil.getTurmoil(player.game).parties.filter((party) => party.partyLeader === player);
  }

  public override bespokeCanAct(player: IPlayer): boolean {
    return this.ledParties(player).length > 0;
  }

  public override bespokeAction(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const parties = this.ledParties(player).map(toName);
    player.defer(() => new SelectParty('Select a party you lead to add a delegate to', 'Send delegate', parties)
      .andThen((partyName) => {
        turmoil.sendDelegateToParty(player, partyName, player.game);
        player.totalDelegatesPlaced += 1;
        player.game.log('${0} sent a delegate to ${1}', (b) => b.player(player).partyName(partyName));
        return undefined;
      }));
    return undefined;
  }
}

import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {PlaceFloaterArrayTile} from '../../venusPhase2/PlaceFloaterArrayTile';
import {ICard} from '../ICard';

export class AlphaRegioIncubators extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ALPHA_REGIO_INCUBATORS,
      tags: [Tag.MICROBE, Tag.VENUS, Tag.BUILDING],
      cost: 17,
      resourceType: CardResource.MICROBE,
      victoryPoints: {resourcesHere: {}, per: 4},

      behavior: {
        global: {venus: 1},
      },

      metadata: {
        cardNumber: 'V90',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a Venus tag, including this, add 1 microbe to this card.', (eb) => {
            eb.tag(Tag.VENUS).startEffect.resource(CardResource.MICROBE);
          }).br;
          b.tile(TileType.VENUS_FLOATER_ARRAY, true).venus(1);
          b.br;
          b.vpText('1 VP per 4 microbes on this card.');
        }),
        description: 'Place a Floating Array on Venus and raise Venus 1 step.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard): void {
    const qty = player.tags.cardTagCount(card, Tag.VENUS);
    player.addResourceTo(this, {qty, log: true});
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag) {
    if (tag === Tag.VENUS) {
      player.addResourceTo(this, {qty: 1, log: true});
    }
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const data = VenusPhase2Expansion.venusPhase2Data(player.game);
    return data.venusSurface.getAvailableSpacesForLand(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(new PlaceFloaterArrayTile(player));
    return undefined;
  }
}

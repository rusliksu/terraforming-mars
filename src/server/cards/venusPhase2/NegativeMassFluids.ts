import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {TileType} from '../../../common/TileType';
import {VenusPhase2Expansion} from '../../venusPhase2/VenusPhase2Expansion';
import {CardResource} from '../../../common/CardResource';
import {Size} from '../../../common/cards/render/Size';

export class NegativeMassFluids extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.NEGATIVE_MASS_FLUIDS,
      tags: [Tag.SCIENCE, Tag.VENUS],
      cost: 11,

      metadata: {
        cardNumber: 'V59',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.VENUS_CLOUD_CITY).colon().effect('Each floater you spend paying for a Venus standard project is worth 1 M€ extra.', (eb) => {
            eb.resource(CardResource.FLOATER, 1).startEffect.plus(Size.SMALL).megacredits(1);
          });
        }),
        description: 'Requires that you own a Venus Habitat.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return VenusPhase2Expansion.spaces(player.game, TileType.VENUS_CLOUD_CITY, {ownedBy: player}).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.increaseFloaterValue();
    return undefined;
  }
}

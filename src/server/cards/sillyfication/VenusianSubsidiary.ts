import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';

export class VenusianSubsidiary extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_SUBSIDIARY,
      tags: [Tag.VENUS, Tag.EARTH],
      cost: 10,

      metadata: {
        cardNumber: 'X07',
        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 M€ for each pair of Venus and Earth tags you have.', (eb) => {
            eb.empty().startAction.megacredits(1).slash().tag(Tag.VENUS).tag(Tag.EARTH);
          });
        }),
      },
    });
  }

  public canAct(): boolean {
    return true;
  }

  public action(player: IPlayer) {
    // Count raw tags and hand each wild tag to whichever side is behind, so a
    // wild tag completes exactly one pair rather than counting for both.
    let venus = player.tags.count(Tag.VENUS, 'raw');
    let earth = player.tags.count(Tag.EARTH, 'raw');
    let wild = player.tags.count(Tag.WILD, 'raw');
    while (wild > 0) {
      if (venus <= earth) {
        venus++;
      } else {
        earth++;
      }
      wild--;
    }
    player.stock.add(Resource.MEGACREDITS, Math.min(venus, earth), {log: true});
    return undefined;
  }
}

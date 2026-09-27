import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {all} from '../Options';

export class AdvancedSchools extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ADVANCED_SCHOOLS,
      tags: [Tag.SCIENCE, Tag.BUILDING],
      cost: 15,

      metadata: {
        cardNumber: 'B39',
        renderData: CardRenderer.builder((b) => {
          b.effect('Gain 3 M€ for each science tag you have, including this.', (eb) => {
            eb.tag(Tag.SCIENCE).startEffect.megacredits(3);
          }).br;
          b.effect('Other players gain 1 M€ for each science tag they have.', (eb) => {
            eb.tag(Tag.SCIENCE, {all}).startEffect.megacredits(1, {all});
          });
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const ownScienceTags = player.tags.count(Tag.SCIENCE, 'raw') + 1; // including this
    player.stock.add(Resource.MEGACREDITS, ownScienceTags * 3, {log: true});

    for (const opponent of player.opponents) {
      const scienceTags = opponent.tags.count(Tag.SCIENCE, 'raw');
      if (scienceTags > 0) {
        opponent.stock.add(Resource.MEGACREDITS, scienceTags, {log: true});
      }
    }
    return undefined;
  }
}

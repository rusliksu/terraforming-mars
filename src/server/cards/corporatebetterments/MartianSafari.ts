import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {ICard} from '@/server/cards/ICard';
import {Resource} from '@/common/Resource';
import {all} from '@/server/cards/Options';

/** A passive M€-production trigger on Animal tags, patterned after Saturn Systems' Jovian-tag trigger. */
export class MartianSafari extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_SAFARI,
      tags: [Tag.ANIMAL],
      cost: 22,
      victoryPoints: {tag: Tag.ANIMAL},

      requirements: {tag: Tag.ANIMAL},

      metadata: {
        cardNumber: 'CB03',
        renderData: CardRenderer.builder((b) => {
          b.effect('Each time any Animal tag is played, including this, increase your M€ production 1 step.', (eb) => {
            eb.tag(Tag.ANIMAL, {all}).startEffect.production((pb) => pb.megacredits(1));
          });
          b.br;
          b.vpText('1 VP per Animal tag you have.');
        }),
        description: 'Requires that you have an Animal tag.',
      },
    });
  }

  public onCardPlayedByAnyPlayer(thisCardOwner: IPlayer, card: ICard) {
    const count = thisCardOwner.tags.cardTagCount(card, Tag.ANIMAL);
    if (count > 0) {
      thisCardOwner.production.add(Resource.MEGACREDITS, count, {log: true, from: {card: this}});
    }
  }
}

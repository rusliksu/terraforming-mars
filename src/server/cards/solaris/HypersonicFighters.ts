import {IProjectCard} from '../IProjectCard';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {Tag} from '../../../common/cards/Tag';
import {CardRenderer} from '../render/CardRenderer';

export class HypersonicFighters extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.HYPERSONIC_FIGHTERS,
      tags: [Tag.EARTH, Tag.SPACE],
      cost: 8,

      requirements: {oxygen: 2},

      resourceType: CardResource.FIGHTER,
      victoryPoints: {resourcesHere: {}, per: 3},

      action: {
        or: {
          autoSelect: true,
          behaviors: [
            {spend: {megacredits: 1}, addResources: 1, title: 'Spend 1 M€ to add 1 fighter resource to this card.'},
            {spend: {steel: 1}, addResources: 2, title: 'Spend 1 steel to add 2 fighter resources to this card.'},
            {spend: {titanium: 1}, addResources: 3, title: 'Spend 1 titanium to add 3 fighter resources to this card.'},
          ],
        },
      },

      metadata: {
        cardNumber: 'So45',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(1).arrow().resource(CardResource.FIGHTER, 1).br;
          b.or().steel(1).arrow().resource(CardResource.FIGHTER, 2).br;
          b.or().titanium(1).arrow().resource(CardResource.FIGHTER, 3).br;
          b.plainText(
            'Action: Spend 1 M€ to add 1 fighter, or 1 steel to add 2 fighters, or 1 titanium to add 3 fighters, to this card.',
            true);
          b.vpText('1 VP for every 3 fighters on this card.');
        }),
        description: 'Requires 2% oxygen.',
      },
    });
  }
}

import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {Tag} from '@/common/cards/Tag';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {IPlayer} from '@/server/IPlayer';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {AltSecondaryTag} from '@/common/cards/render/AltSecondaryTag';

export class InventrixRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.INVENTRIX_REBALANCED,
      tags: [Tag.SCIENCE],
      startingMegaCredits: 45,
      globalParameterRequirementBonus: {steps: 3},

      firstAction: {
        text: 'Draw 3 cards',
        drawCard: 3,
      },

      metadata: {
        cardNumber: 'R43',
        description: 'As your first action in the game, draw 3 cards. Start with 45 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.megacredits(45).nbsp.cards(3);
          b.corpBox('effect', (ce) => {
            ce.effect('Your temperature, oxygen, ocean, and Venus requirements are +3 or -3 steps, your choice in each case.', (eb) => {
              eb.plate('Global requirements').startEffect.text('+/- 3');
            });
            ce.effect('Cards with a requirement cost 1 M€ less.', (eb) => {
              eb.cards(1, {secondaryTag: AltSecondaryTag.REQ}).startEffect.megacredits(-1);
            });
          });
        }),
      },
    });
  }

  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    return card.requirements.length > 0 ? 1 : 0;
  }
}

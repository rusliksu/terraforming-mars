import {PartyName} from '@/common/turmoil/PartyName';
import {Tag} from '@/common/cards/Tag';
import {ActiveCorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {IPlayer} from '@/server/IPlayer';
import {IStandardProjectCard} from '@/server/cards/IStandardProjectCard';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class ThorgateRebalanced extends ActiveCorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.THORGATE_REBALANCED,
      tags: [Tag.SCIENCE, Tag.POWER],
      startingMegaCredits: 40,

      behavior: {
        production: {energy: 1},
      },

      action: {production: {energy: -1}, stock: {megacredits: 6}},

      cardDiscount: {tag: Tag.POWER, amount: 3, per: 'card'},
      metadata: {
        cardNumber: 'R13',
        description: 'You start with 1 energy production and 40 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.production((pb) => pb.energy(1)).nbsp.megacredits(40);
          b.corpBox('action', (ce) => {
            ce.action('Decrease your energy production 1 step and gain 6 M€.', (eb) => {
              eb.production((pb) => pb.energy(1)).startAction.megacredits(6);
            });
          });
          b.corpBox('effect', (ce) => {
            ce.effect('When playing a power card OR THE STANDARD PROJECT POWER PLANT OR THE KELVINISTS RULING POLICY ACTION, you pay 3 M€ less for it.', (eb) => {
              eb.tag(Tag.POWER).asterix().startEffect.megacredits(-3);
            });
          });
        }),
      },
    });
  }

  public getStandardProjectDiscount(_player: IPlayer, card: IStandardProjectCard): number {
    if (card.name === CardName.POWER_PLANT_STANDARD_PROJECT) {
      return 3;
    }
    return 0;
  }

  public getPartyActionDiscount(_player: IPlayer, party: PartyName): number {
    return party === PartyName.KELVINISTS ? 3 : 0;
  }
}

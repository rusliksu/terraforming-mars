import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {IPlayer} from '@/server/IPlayer';
import {Resource} from '@/common/Resource';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class PoseidonRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.POSEIDON_REBALANCED,
      startingMegaCredits: 40,

      firstAction: {
        text: 'Place a colony',
        colonies: {buildColony: {}},
      },
      metadata: {
        cardNumber: 'R02',
        description: 'You start with 40 M€ As your first action, place a colony.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(40).nbsp.colonies(1);
          b.corpBox('effect', (ce) => {
            ce.effect('When you build a colony, including this, raise your M€ production 2 steps.', (eb) => {
              eb.colonies(1).startEffect.production((pb) => pb.megacredits(2));
            });
          });
        }),
      },
    });
  }

  public getColonyPlacementMegaCreditProduction(cardOwner: IPlayer, colonyOwner: IPlayer): number {
    return cardOwner.id === colonyOwner.id ? 2 : 0;
  }

  public onColonyAddedByAnyPlayer(cardOwner: IPlayer, colonyOwner: IPlayer) {
    const production = this.getColonyPlacementMegaCreditProduction(cardOwner, colonyOwner);
    if (production > 0) {
      cardOwner.production.add(Resource.MEGACREDITS, production, {log: true, from: {card: this}});
    }
  }
}

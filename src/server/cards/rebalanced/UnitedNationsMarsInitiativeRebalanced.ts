import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {IActionCard} from '@/server/cards/ICard';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {SelectPaymentDeferred} from '@/server/deferredActions/SelectPaymentDeferred';
import {TITLES} from '@/server/inputs/titles';
export class UnitedNationsMarsInitiativeRebalanced extends CorporationCard implements IActionCard, ICorporationCard {
  constructor() {
    super({
      name: CardName.UNITED_NATIONS_MARS_INITIATIVE_REBALANCED,
      tags: [Tag.EARTH],
      startingMegaCredits: 50,

      metadata: {
        cardNumber: 'R32',
        description: 'You start with 50 M€.',
        renderData: CardRenderer.builder((b) => {
          b.empty().megacredits(50);
          b.corpBox('action', (ce) => {
            ce.action('If your Terraform Rating was raised this generation, you may pay 1 M€ to raise it 1 step more.', (eb) => {
              eb.megacredits(1).startAction.tr(1).asterix();
            });
          });
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.hasIncreasedTerraformRatingThisGeneration && player.canAfford({cost: 1, tr: {tr: 1}});
  }

  public action(player: IPlayer) {
    player.game.defer(new SelectPaymentDeferred(player, 1, {title: TITLES.payForCardAction(this.name)}))
      .andThen(() => player.increaseTerraformRating());
    return undefined;
  }
}

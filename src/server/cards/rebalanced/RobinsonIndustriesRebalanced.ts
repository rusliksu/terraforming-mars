import {Tag} from '@/common/cards/Tag';
import {IActionCard} from '@/server/cards/ICard';
import {IPlayer} from '@/server/IPlayer';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {OrOptions} from '@/server/inputs/OrOptions';
import {SelectOption} from '@/server/inputs/SelectOption';
import {ALL_RESOURCES} from '@/common/Resource';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {SelectPaymentDeferred} from '@/server/deferredActions/SelectPaymentDeferred';
import {TITLES} from '@/server/inputs/titles';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class RobinsonIndustriesRebalanced extends CorporationCard implements ICorporationCard, IActionCard {
  constructor() {
    super({
      name: CardName.ROBINSON_INDUSTRIES_REBALANCED,
      tags: [Tag.WILD],
      startingMegaCredits: 40,

      behavior: {production: {megacredits: 2}},

      metadata: {
        cardNumber: 'R27',
        description: 'You start with 40 M€ and 2 M€ production. When you perform an action, the wild tag counts as any tag of your choice.',
        renderData: CardRenderer.builder((b) => {
          b.br.br.br;
          b.megacredits(40).nbsp.production((pb) => pb.megacredits(2));
          b.corpBox('action', (ce) => {
            ce.action('Spend 4 M€ to increase (one of) your LOWEST production 1 step.', (eb) => {
              eb.megacredits(4).startAction.production((pb) => pb.wild(1).asterix());
            });
          });
        }),
      },
    });
  }
  public canAct(player: IPlayer): boolean {
    return player.canAfford(4);
  }

  public action(player: IPlayer) {
    let minimum = player.production.megacredits;
    let lowest: Array<SelectOption> = [];

    ALL_RESOURCES.forEach((resource) => {
      const option = new SelectOption('Increase ' + resource + ' production 1 step').andThen(() => {
        player.game.defer(new SelectPaymentDeferred(player, 4, {title: TITLES.payForCardAction(this.name)}))
          // Add production after payment, to prevent Manutech from being in the way.
          .andThen(() => player.production.add(resource, 1, {log: true}));
        return undefined;
      });

      if (player.production[resource] < minimum) {
        lowest = [];
        minimum = player.production[resource];
      }
      if (player.production[resource] === minimum) {
        lowest.push(option);
      }
    });

    const result = new OrOptions();
    result.options = lowest;
    return result;
  }
}

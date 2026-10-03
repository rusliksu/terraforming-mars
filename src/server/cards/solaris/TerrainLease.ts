import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Reactive listener, implemented via the existing `ICard.onStandardProject` hook -- the same
 * mechanism AppliedResearch (idesOfMars) uses -- which `StandardProjectCard.projectPlayed`
 * already calls for every standard project this player uses, Sell Patents included. Sell Patents
 * is excluded below to match the printed reminder text ("Selling patents, trade and adding
 * delegates aren't standard projects."). Trade (a colony action) and adding a delegate (Turmoil's
 * lobby/3 M€/5 M€ "send a delegate" action, see Turmoil.ts's getSendDelegateInput) are never
 * `IStandardProjectCard`s and never route through `onStandardProject` at all in this engine, so
 * they need no special-casing here -- they're excluded automatically, not explicitly.
 */
export class TerrainLease extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.TERRAIN_LEASE,
      tags: [Tag.BUILDING],
      cost: 15,

      requirements: {party: PartyName.REDS},

      behavior: {
        tr: 1,
      },

      metadata: {
        cardNumber: 'SL33',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you use a Standard Project (other than Sell Patents), gain 1 M€.', (eb) => {
            eb.text('SP').startEffect.megacredits(1);
          }).br;
          b.tr(1);
        }),
        description: 'Requires that Reds are ruling or that you have 2 delegates there. Raise your TR 1 step. ' +
          'Effect: Whenever you use a Standard Project (other than Sell Patents, Trade, or adding a Delegate), gain 1 M€.',
      },
    });
  }

  public onStandardProject(player: IPlayer, project: IStandardProjectCard): void {
    if (project.name === CardName.SELL_PATENTS_STANDARD_PROJECT) {
      return;
    }
    player.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
  }
}

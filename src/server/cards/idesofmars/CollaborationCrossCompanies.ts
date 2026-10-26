import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerId} from '../../../common/Types';
import {PlayerInput} from '../../PlayerInput';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';

type Gift = {opponentId: PlayerId, generation: number};

export class CollaborationCrossCompanies extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.COLLABORATION_CROSS_COMPANIES,
      tags: [Tag.EARTH],
      cost: 2,

      requirements: {tr: 25},

      metadata: {
        cardNumber: 'Im113',
        renderData: CardRenderer.builder((b) => {
          b.action('Give 6 M€, 3 plants, or 6 heat to an opponent.', (ab) => {
            ab.empty().startAction.megacredits(6).slash().plants(3).slash().heat(6);
          }).br;
          b.effect('If that opponent raises their TR this generation, raise your TR 1 step.', (eb) => {
            eb.tr(1).startEffect.tr(1);
          });
        }),
        description: 'Requires a TR of at least 25.',
      },
    });
  }

  // Every opponent this player has given resources to this generation, tracked so the
  // TR-raise bonus below can tell "the opponent I gave to" apart from anyone else raising
  // their TR, and "this generation" from any other. Cleared per-entry once triggered.
  public data: {gifts: Array<Gift>} = {gifts: []};

  public canAct(player: IPlayer): boolean {
    if (player.opponents.length === 0) {
      return false;
    }
    return player.megaCredits >= 6 || player.plants >= 3 || player.heat >= 6;
  }

  private give(player: IPlayer, resource: Resource, amount: number): PlayerInput {
    return new SelectPlayer(player.opponents, `Select an opponent to give ${amount} ${resource} to`, 'Give')
      .andThen((opponent) => {
        player.stock.deduct(resource, amount, {log: true});
        opponent.stock.add(resource, amount, {log: true, from: {player}});
        this.data.gifts.push({opponentId: opponent.id, generation: player.game.generation});
        return undefined;
      });
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const options = [];
    if (player.megaCredits >= 6) {
      options.push(new SelectOption('Give 6 M€', 'Give').andThen(() => this.give(player, Resource.MEGACREDITS, 6)));
    }
    if (player.plants >= 3) {
      options.push(new SelectOption('Give 3 plants', 'Give').andThen(() => this.give(player, Resource.PLANTS, 3)));
    }
    if (player.heat >= 6) {
      options.push(new SelectOption('Give 6 heat', 'Give').andThen(() => this.give(player, Resource.HEAT, 6)));
    }
    return new OrOptions(...options);
  }

  public onIncreaseTerraformRatingByAnyPlayer(cardOwner: IPlayer, raiser: IPlayer, steps: number) {
    if (steps <= 0) {
      return;
    }
    const generation = cardOwner.game.generation;
    const idx = this.data.gifts.findIndex((gift) => gift.opponentId === raiser.id && gift.generation === generation);
    if (idx === -1) {
      return;
    }
    this.data.gifts.splice(idx, 1);
    cardOwner.increaseTerraformRating(1, {log: true, from: {card: this}});
  }
}

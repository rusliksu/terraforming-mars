import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {SelectAmount} from '../../inputs/SelectAmount';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class Switcharoo extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SWITCHAROO,
      cost: 3,

      metadata: {
        cardNumber: 'X37',
        renderData: CardRenderer.builder((b) => {
          b.minus().steel(1).nbsp.plus().plants(1, {all}).asterix();
        }),
        description: 'Give any number of your steel to any player and take an equal number of that player\'s plants.',
      },
    });
  }

  private swapTargets(player: IPlayer) {
    return player.opponents.filter((p) => p.plants > 0 && !p.plantsAreProtected());
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.steel > 0 && this.swapTargets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const targets = this.swapTargets(player);
    if (targets.length === 0) {
      return undefined;
    }
    return new SelectPlayer(targets, 'Select a player to swap steel for plants with', 'Select')
      .andThen((target) => {
        const max = Math.min(player.steel, target.plants);
        return new SelectAmount('How much steel to swap for plants?', 'Swap', 1, max, true)
          .andThen((amount) => {
            player.stock.deduct(Resource.STEEL, amount);
            target.stock.add(Resource.STEEL, amount, {log: true});
            target.stock.deduct(Resource.PLANTS, amount);
            player.stock.add(Resource.PLANTS, amount, {log: true});
            return undefined;
          });
      });
  }
}

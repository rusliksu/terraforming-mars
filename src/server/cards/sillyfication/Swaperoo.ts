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

export class Swaperoo extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SWAPEROO,
      cost: 3,

      metadata: {
        cardNumber: 'X36',
        renderData: CardRenderer.builder((b) => {
          b.minus().steel(1).nbsp.plus().titanium(1, {all}).asterix();
        }),
        description: 'Give any number of your steel to any player and take an equal number of that player\'s titanium.',
      },
    });
  }

  private swapTargets(player: IPlayer) {
    return player.opponents.filter((p) => p.titanium > 0 && !p.alloysAreProtected());
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.steel > 0 && this.swapTargets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const targets = this.swapTargets(player);
    if (targets.length === 0) {
      return undefined;
    }
    return new SelectPlayer(targets, 'Select a player to swap steel for titanium with', 'Select')
      .andThen((target) => {
        const max = Math.min(player.steel, target.titanium);
        return new SelectAmount('How much steel to swap for titanium?', 'Swap', 1, max, true)
          .andThen((amount) => {
            player.stock.deduct(Resource.STEEL, amount);
            target.stock.add(Resource.STEEL, amount, {log: true});
            target.stock.deduct(Resource.TITANIUM, amount);
            player.stock.add(Resource.TITANIUM, amount, {log: true});
            return undefined;
          });
      });
  }
}

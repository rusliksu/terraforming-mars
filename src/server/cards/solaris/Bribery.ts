import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class Bribery extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.BRIBERY,
      tags: [],
      cost: 1,

      requirements: {party: PartyName.BUREAUCRATS},

      metadata: {
        cardNumber: 'SL38',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().megacredits(1, {all})).nbsp.production((pb) => pb.plus().megacredits(1));
        }),
        description: 'Requires that Bureaucrats are ruling or that you have 2 delegates there. Choose an ' +
          'opponent. Decrease their M€ production 1 step and increase your M€ production 1 step.',
      },
    });
  }

  private targets(player: IPlayer): ReadonlyArray<IPlayer> {
    return player.opponents.filter((opponent) => opponent.canHaveProductionReduced(Resource.MEGACREDITS, 1, player));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.targets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const targets = this.targets(player);
    const bribe = (target: IPlayer) => {
      target.production.add(Resource.MEGACREDITS, -1, {log: true, from: {player}});
      player.production.add(Resource.MEGACREDITS, 1, {log: true});
      return undefined;
    };

    if (targets.length === 1) {
      return bribe(targets[0]);
    }
    return new SelectPlayer(targets, 'Select an opponent to bribe', 'Select')
      .andThen((target) => bribe(target));
  }
}

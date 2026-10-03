import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {Turmoil} from '../../turmoil/Turmoil';
import {CardRenderer} from '../render/CardRenderer';

/** Blue card: +2 delegates in your reserve on play, then 1 M€ each time you send a delegate. */
export class Nepotism extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.NEPOTISM,
      tags: [Tag.EARTH],
      cost: 10,

      metadata: {
        cardNumber: 'X70',
        renderData: CardRenderer.builder((b) => {
          b.plus().delegates(2).br;
          b.effect('When you place a delegate, you gain 1 M€.', (eb) => {
            eb.delegates(1).startEffect.megacredits(1);
          });
        }),
        description: 'Add 2 delegates to your reserve for the rest of the game (from 7 to 9).',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    Turmoil.ifTurmoil(player.game, (turmoil) => {
      turmoil.delegateReserve.add(player, 2);
      player.game.log('${0} added 2 delegates to their reserve', (b) => b.player(player));
    });
    return undefined;
  }

  public onDelegateSent(cardOwner: IPlayer, delegateOwner: IPlayer) {
    if (delegateOwner.id === cardOwner.id) {
      cardOwner.stock.add(Resource.MEGACREDITS, 1, {log: true, from: {card: this}});
    }
  }
}

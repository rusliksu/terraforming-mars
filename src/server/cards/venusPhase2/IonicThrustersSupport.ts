import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardResource} from '../../../common/CardResource';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class IonicThrustersSupport extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.IONIC_THRUSTERS_SUPPORT,
      tags: [Tag.VENUS],
      cost: 17,

      metadata: {
        cardNumber: 'V64',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.FLOATER, 2).asterix().colon().production((pb) => pb.megacredits(1));
        }),
        description: 'Increase your M€ production 1 step for every 2 floaters that ONE opponent of your choice owns.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.opponents.length > 0;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    return new SelectPlayer(player.opponents, 'Select a player whose floaters to count', 'Select')
      .andThen((target) => {
        const steps = Math.floor(target.getResourceCount(CardResource.FLOATER) / 2);
        player.production.add(Resource.MEGACREDITS, steps, {log: true});
        return undefined;
      });
  }
}

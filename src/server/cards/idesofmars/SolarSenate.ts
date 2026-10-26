import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {SendDelegateToArea} from '../../deferredActions/SendDelegateToArea';

export class SolarSenate extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SOLAR_SENATE,
      tags: [Tag.BUILDING],
      cost: 12,
      victoryPoints: 2,

      requirements: [{tag: Tag.EARTH}, {tag: Tag.MARS}],

      behavior: {
        production: {megacredits: 1},
      },

      metadata: {
        cardNumber: '142',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1));
        }),
        description: 'Requires 1 Earth tag and 1 Mars tag. Each player that has at least 1 colony adds a delegate ' +
          'to any party. Increase your M€ production 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    for (const p of player.game.players) {
      if (p.getColoniesCount() >= 1) {
        p.game.defer(new SendDelegateToArea(p, 'Select where to send a delegate for Solar Senate'));
      }
    }
    return undefined;
  }
}

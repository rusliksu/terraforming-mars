import {Tag} from '../../../common/cards/Tag';
import {PreludeCard} from '../prelude/PreludeCard';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';

export class SlowStart extends PreludeCard {
  constructor() {
    super({
      name: CardName.SLOW_START,
      tags: [Tag.WILD],

      behavior: {
        production: {megacredits: 2},
      },

      metadata: {
        cardNumber: 'T14',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2)).br;
          b.text('everyone skips generation 2', {size: Size.SMALL, uppercase});
        }),
        description: 'Increase your M€ production 2 steps. Next generation, every player skips their actions and the game goes straight to the production phase.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.game.skipGeneration1Actions = true;
    player.game.log('${0} sends every player straight to the production phase next generation.', (b) => b.card(this));
    return undefined;
  }
}

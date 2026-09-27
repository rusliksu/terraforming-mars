import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class GigaInterferometer extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GIGA_INTERFEROMETER,
      tags: [Tag.SCIENCE],
      cost: 0,

      metadata: {
        cardNumber: 'H52',
        renderData: CardRenderer.builder((b) => {
          b.plainText('A RESEARCH PHASE BEGINS IMMEDIATELY.', true);
        }),
        description: 'Requires that each player has at least 6 M€. Immediately hold a research phase: every ' +
          'player drafts cards and may buy them, just like at the start of a generation.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.players.every((p) => p.megaCredits >= 6);
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.log('${0} triggers an immediate research phase for every player', (b) => b.card(this));
    game.requestAdditionalResearch();
    return undefined;
  }
}

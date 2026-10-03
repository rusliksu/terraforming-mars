import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {DrawCards} from '../../deferredActions/DrawCards';

export class ResearchPhase extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.RESEARCH_PHASE,
      tags: [Tag.SCIENCE],
      cost: 0,

      metadata: {
        cardNumber: 'T33',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Immediately hold a research phase: every player draws 4 cards and may buy any of them, just like at the start of a generation.', true);
        }),
        description: 'Requires that each player has at least 6 M€.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.players.every((p) => p.megaCredits >= 6);
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const p of game.players) {
      game.defer(DrawCards.keepSome(p, 4, {paying: true}));
    }
    return undefined;
  }
}

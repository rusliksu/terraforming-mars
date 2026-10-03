import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

/** For the rest of this generation, every card costs each player 1 M€ more per tag they already have of that card's tags. */
export class TagTaxer extends Card implements IProjectCard {
  public generationUsed: number | undefined = undefined;

  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.TAG_TAXER,
      cost: 8,
      victoryPoints: -1,

      metadata: {
        cardNumber: 'T04',
        renderData: CardRenderer.builder((b) => {
          b.text('this gen').colon().megacredits(1, {all}).slash().text('tag you have');
        }),
        description: 'Play as your first action of a generation. For the rest of this generation, every card costs each player 1 M€ more for each tag they already have of that card\'s tags. (E.g. if you have 5 Earth tags, Earth Office costs you 5 M€ more.)',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.actionsTakenThisGame === player.actionsTakenAtGenerationStart;
  }

  public override bespokePlay(player: IPlayer) {
    this.generationUsed = player.game.generation;
    for (const p of player.game.players) {
      if (!p.removedFromPlayCards.includes(this)) {
        p.removedFromPlayCards.push(this);
      }
    }
    return undefined;
  }

  public override getCardDiscount(player: IPlayer, card: IProjectCard): number {
    if (this.generationUsed !== player.game.generation) {
      return 0;
    }
    let tax = 0;
    for (const tag of card.tags) {
      tax += player.tags.count(tag);
    }
    return -tax;
  }
}

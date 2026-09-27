import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectCard} from '../../inputs/SelectCard';
import {LogHelper} from '../../LogHelper';
import {PreludesExpansion} from '../../preludes/PreludesExpansion';
import {CardRenderer} from '../render/CardRenderer';

export class CompanyMerger extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COMPANY_MERGER,
      tags: [Tag.EARTH, Tag.BUILDING],
      cost: 77,
      victoryPoints: 2,

      metadata: {
        cardNumber: 'CB53',
        renderData: CardRenderer.builder((b) => {
          b.corporation().asterix().br;
          b.prelude().asterix();
        }),
        description: 'Draw 2 corporation cards and play one of them, keeping all its effects, actions, and starting M€, discarding the other. ' +
          'Then draw 2 prelude cards and play one of them, discarding the other.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer) {
    const game = player.game;
    if (!game.corporationDeck.canDraw(2)) {
      this.addWarning('deckTooSmall');
    }
    if (!game.preludeDeck.canDraw(2)) {
      this.addWarning('deckTooSmall');
    }
    return true;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const corps = game.corporationDeck.drawN(game, 2);
    LogHelper.logDrawnCards(player, corps, true);

    player.defer(() => {
      return new SelectCard('Choose a corporation card to play', 'Play', corps)
        .andThen(([card]) => {
          player.playCorporationCard(card);
          for (const corp of corps) {
            if (corp.name !== card.name) {
              game.corporationDeck.discard(corp);
            }
          }
          const preludes = game.preludeDeck.drawN(game, 2);
          LogHelper.logDrawnCards(player, preludes, true);
          player.defer(() => PreludesExpansion.selectPreludeToPlay(player, preludes, 'discard'));
          return undefined;
        });
    });
    return undefined;
  }
}

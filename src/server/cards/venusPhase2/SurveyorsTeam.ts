import {Size} from '../../../common/cards/render/Size';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {PLANETARY_TAGS} from '../../pathfinders/PathfindersData';

export class SurveyorsTeam extends Card implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SURVEYORS_TEAM,
      tags: [Tag.MARS, Tag.EARTH],
      cost: 10,

      metadata: {
        cardNumber: 'V76',
        renderData: CardRenderer.builder((b) => {
          b.action('reveal the top card of the draw deck. Add it to your hand if it has a Planetary tag. Otherwise, discard it.', (eb) => {
            eb.empty().startAction.cards(1).asterix();
          });
          b.br;
          for (const tag of PLANETARY_TAGS) {
            b.tag(tag, {size: Size.SMALL});
          }
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.game.projectDeck.canDraw(1);
  }

  public action(player: IPlayer) {
    const card = player.game.projectDeck.drawOrThrow(player.game);
    if (card.tags.some((tag) => (PLANETARY_TAGS as ReadonlyArray<Tag>).includes(tag))) {
      player.cardsInHand.push(card);
      player.game.log('${0} revealed and kept ${1}', (b) => b.player(player).card(card, {tags: true}));
    } else {
      player.game.log('${0} revealed and discarded ${1}', (b) => b.player(player).card(card, {tags: true}));
      player.game.projectDeck.discard(card);
    }
    return undefined;
  }
}

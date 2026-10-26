import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {tag} from '../render/DynamicVictoryPoints';

export class HistoricalVideographicArchive extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.HISTORICAL_VIDEOGRAPHIC_ARCHIVE,
      tags: [Tag.EARTH],
      cost: 18,

      // The declarative `{tag: Tag.EVENT, ...}` VP shape counts the EVENT tag on cards that
      // print it (via player.tags.count), which is a different, smaller number than "how many
      // Event cards this player has played" (player.getPlayedEventsCount()) - Event cards don't
      // carry an explicit EVENT tag in their own `tags` array in this codebase (see MediaArchives
      // and TowingAComet). So this needs a bespoke getVictoryPoints() below instead.
      victoryPoints: 'special',

      metadata: {
        cardNumber: 'H03',
        renderData: CardRenderer.builder((b) => {
          b.vpText('1 VP for each 3 Event cards you have (rounded down).');
        }),
        victoryPoints: tag(Tag.EVENT, 1, 3),
      },
    });
  }

  public override getVictoryPoints(player: IPlayer): number {
    return Math.floor(player.getPlayedEventsCount() / 3);
  }
}

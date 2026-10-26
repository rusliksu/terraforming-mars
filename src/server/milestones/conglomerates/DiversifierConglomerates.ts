import {IMilestone} from '../IMilestone';
import {IPlayer} from '../../IPlayer';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';

const THRESHOLD = 10;

/**
 * Conglomerates' Diversifier variant. The generic x1.5 team scaling (used by every other
 * board milestone via conglomeratesVariant) would require ceil(8 * 1.5) = 12 tags - but a
 * base (non-expansion) game only has 10 distinct tags in it, so that's unreachable even for
 * two players combined. This unions the team's distinct tags directly (summing each
 * player's own count, like the generic scaling does, double-counts any tag both players
 * already share) and claims at a real, always-reachable 10 - the actual ceiling.
 */
export class DiversifierConglomerates implements IMilestone {
  public readonly name = 'Diversifier10';
  public readonly description = 'Have 10 different tags in play between you and your teammate';

  public getScore(player: IPlayer): number {
    const team = [player, ...player.teammates()];
    const uniqueTags = new Set<Tag>();
    let wildTagCount = 0;

    for (const member of team) {
      const isOdyssey = member.tableau.has(CardName.ODYSSEY);
      for (const card of member.tableau) {
        if (!isOdyssey && card.type === CardType.EVENT) {
          continue;
        }
        for (const tag of card.tags) {
          if (tag === Tag.WILD) {
            wildTagCount++;
          } else {
            uniqueTags.add(tag);
          }
        }
      }
    }

    const maximum = player.tags.tagsInGame();
    return Math.min(uniqueTags.size + wildTagCount, maximum);
  }

  public canClaim(player: IPlayer): boolean {
    return this.getScore(player) >= THRESHOLD;
  }
}

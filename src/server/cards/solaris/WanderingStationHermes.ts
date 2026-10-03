import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Judgment call (see task notes): the printed text -- "increase your M€ production 1 step for
 * every tag of the lowest Planetary Influence track tag you own" -- doesn't map onto any
 * mechanic that exists in this engine (there's no per-party "Planetary Influence track tag").
 * Faithful reading chosen here, per the task's own suggested simplification: look at every tag
 * category this player owns at least one of (via `player.tags.countAllTags()`, the same
 * literal/raw tag count used for milestones/awards), and grant M€ production equal to
 * whichever owned tag category has the FEWEST tags. If the player owns no tags at all, this is a
 * no-op (0 production). This is unresolvable from the source text alone; documented here rather
 * than blocking.
 */
export class WanderingStationHermes extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.WANDERING_STATION_HERMES,
      tags: [Tag.JOVIAN],
      cost: 18,

      requirements: {party: PartyName.SPOME},

      behavior: {
        tr: 1,
      },

      metadata: {
        cardNumber: 'SL35',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1)).slash().tag(Tag.WILD).tr(1);
        }),
        description: 'Requires that Spome are ruling or that you have 2 delegates there. Increase your M€ ' +
          'production 1 step for every tag of your lowest-count tag (among tags you have at least one of). ' +
          'Raise your TR 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const counts = Object.values(player.tags.countAllTags()) as ReadonlyArray<number>;
    const ownedCounts = counts.filter((count) => count > 0);
    if (ownedCounts.length > 0) {
      const fewest = Math.min(...ownedCounts);
      if (fewest > 0) {
        player.production.add(Resource.MEGACREDITS, fewest, {log: true});
      }
    }
    return undefined;
  }
}

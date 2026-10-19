import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {TileType} from '../../../common/TileType';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {max} from '../Options';

/**
 * "Immediately play an active card that collects Animals without paying its cost and
 * ignoring the requirements" is a genuinely novel mechanic -- no precedent for "reveal from
 * the deck and play a card for free" exists elsewhere in this codebase. Implemented here as:
 * reveal cards from the project deck (discarding non-matches, via Deck.drawByConditionOrThrow,
 * same helper CharityDonation.ts uses to reveal cards) until an ACTIVE card with an Animal
 * resourceType is found, then player.playCard(found) with no payment -- playCard never checks
 * canPlay/requirements itself, so omitting payment and never calling canPlay satisfies both
 * "without paying its cost" and "ignoring the requirements".
 *
 * Judgment call: the source card doesn't say whether the player chooses among matches or takes
 * the first one found; this takes the literal "immediately play" reading (no choice, first
 * Active+Animal card revealed is played, mirroring how official "reveal until you find X" cards
 * work) rather than inventing a selection step.
 */
export class LivestockGiantDome extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.LIVESTOCK_GIANT_DOME,
      tags: [Tag.BUILDING, Tag.ANIMAL],
      cost: 30,

      requirements: {oxygen: 7, max},

      behavior: {
        tile: {
          type: TileType.ANIMAL_DOME,
          on: 'isolated',
          adjacencyBonus: {bonus: [SpaceBonus.ANIMAL]},
        },
      },

      metadata: {
        cardNumber: 'H33',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.ANIMAL_DOME).asterix().br;
          b.plainText('Immediately play an Active card that collects Animals, ignoring its cost and requirements.', true);
        }),
        description: 'Requires a maximum of 7% oxygen. Place the special Animal Dome tile NEXT TO NO OTHER TILE. ' +
          'Adjacency bonus: 1 Animal.',
      },
    });
  }

  private static isAnimalCollector(card: IProjectCard): boolean {
    return card.type === CardType.ACTIVE && card.resourceType === CardResource.ANIMAL;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const [found] = game.projectDeck.drawByConditionOrThrow(game, 1, LivestockGiantDome.isAnimalCollector);
    if (found === undefined) {
      game.log('${0} found no Active Animal-collecting card in the deck to play for free', (b) => b.player(player));
      return undefined;
    }
    game.log('${0} played ${1} for free, ignoring its cost and requirements', (b) => b.player(player).card(found));
    player.playCard(found);
    return undefined;
  }
}

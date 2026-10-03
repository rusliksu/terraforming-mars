import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {TileType} from '../../../common/TileType';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Genuinely novel end-of-game mechanic: "place a City on Mars" as the very last tile placement
 * of the game, after the final greenery phase resolves for everyone but before scoring. This
 * needed a new hook -- see ICard.onFinalGreeneryPlacementComplete and
 * Game.resolveEndOfGameCardEffects (called from takeNextFinalGreeneryAction), since nothing like
 * it existed before this card.
 *
 * `this.data` is set the first time this resolves (whether or not a space was actually
 * available) so the hook -- which Game.ts may invoke more than once while it drains deferred
 * actions -- only ever queues the placement once.
 */
export class HiddenCity extends Card implements IProjectCard {
  /** Set once onFinalGreeneryPlacementComplete has queued its (one-shot) work. */
  public data = false;

  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.HIDDEN_CITY,
      tags: [Tag.MARS, Tag.MARS],
      cost: 14,
      victoryPoints: 1,

      behavior: {
        production: {energy: -1, megacredits: 2},
      },

      requirements: {tag: Tag.MARS, count: 2},

      metadata: {
        cardNumber: 'IM133',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().energy(1).megacredits(2));
          b.br;
          b.effect('At the end of the game, after the final greenery placement, place a City tile on Mars.', (eb) => {
            eb.empty().startEffect.city().asterix();
          });
        }),
        description: 'Requires 2 Mars tags. Decrease your energy production 1 step and increase ' +
          'your M€ production 2 steps. If no areas are available, place it on the outside of the map.',
      },
    });
  }

  public onFinalGreeneryPlacementComplete(player: IPlayer): void {
    if (this.data === true) {
      return;
    }
    this.data = true;

    player.defer(() => {
      const spaces = player.game.board.getAvailableSpacesForCity(player);
      if (spaces.length === 0) {
        player.game.log(
          '${0} could not find room on Mars to place ${1} -- it is placed outside the map',
          (b) => b.player(player).card(this));
        return undefined;
      }

      return new SelectSpace('Select space for the Hidden City tile', spaces)
        .andThen((space) => {
          player.game.addTile(player, space, {tileType: TileType.CITY, card: this.name});
          player.game.grantPlacementBonuses(player, space);
          player.game.log('${0} placed the Hidden City tile at ${1}', (b) => b.player(player).space(space));
          return undefined;
        });
    });
  }
}

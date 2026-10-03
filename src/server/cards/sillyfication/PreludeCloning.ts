import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {IPreludeCard} from '../prelude/IPreludeCard';
import {CardName} from '../../../common/cards/CardName';
import {SelectCard} from '../../inputs/SelectCard';
import {newPrelude} from '../../createCard';
import {CardRenderer} from '../render/CardRenderer';

/** Copy a prelude another player has played, and play the copy. */
export class PreludeCloning extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.PRELUDE_CLONING,
      tags: [Tag.SCIENCE],
      cost: 14,
      victoryPoints: 1,

      requirements: {tag: Tag.SCIENCE, count: 4},

      metadata: {
        cardNumber: 'X74',
        renderData: CardRenderer.builder((b) => {
          b.prelude().asterix();
        }),
        description: 'Requires 4 science tags. Play a copy of a prelude another player has played.',
      },
    });
  }

  private cloneablePreludes(player: IPlayer): ReadonlyArray<IPreludeCard> {
    const preludes: Array<IPreludeCard> = [];
    for (const opponent of player.opponents) {
      preludes.push(...opponent.playedCards.preludes());
    }
    return preludes;
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.cloneablePreludes(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const preludes = this.cloneablePreludes(player);
    return new SelectCard('Select a prelude to copy and play', 'Copy', preludes, {showOwner: true})
      .andThen(([prelude]) => {
        const copy = newPrelude(prelude.name);
        if (copy !== undefined) {
          player.game.log('${0} cloned and played ${1}', (b) => b.player(player).card(copy));
          player.playCard(copy, undefined, 'add');
        }
        return undefined;
      });
  }
}

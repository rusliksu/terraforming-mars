import {Tag} from '../../../common/cards/Tag';
import {PreludeCard} from '../prelude/PreludeCard';
import {IPlayer} from '../../IPlayer';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {SelectCard} from '../../inputs/SelectCard';
import {CardRenderer} from '../render/CardRenderer';
import {digit, all} from '../Options';
import {DeimosDoubleDownCopy} from './DeimosDoubleDownCopy';

/** Space prelude: gain 2 titanium, draw 2 Space events, then hand every player (including
 * you) a DeimosDoubleDownCopy of one - a genuinely distinct card (shown as "<real card>
 * Copy") that delegates everything else (cost/tags/behavior/etc) to the real thing. Every
 * recipient gets the same kind of copy, not just the acting player, so nobody ever risks
 * holding two playable instances of the same name (playedCards forbids duplicates in the
 * tableau) regardless of what else they're holding. */
export class DeimosDoubleDown extends PreludeCard {
  constructor() {
    super({
      name: CardName.DEIMOS_DOUBLE_DOWN,
      tags: [Tag.SPACE],

      behavior: {
        stock: {titanium: 2},
        drawCard: {count: 2, tag: Tag.SPACE, type: CardType.EVENT},
      },

      metadata: {
        cardNumber: 'X76',
        renderData: CardRenderer.builder((b) => {
          b.titanium(2, {digit}).cards(2, {secondaryTag: Tag.EVENT}).super((sb) => sb.tag(Tag.SPACE)).br;
          b.text('copy to all').colon().cards(1, {secondaryTag: Tag.EVENT, all}).super((sb) => sb.tag(Tag.SPACE));
        }),
        description: 'Gain 2 titanium. Draw 2 Space event cards. Then choose a Space event in your hand; every player, including you, gets a copy of it.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const spaceEvents = player.cardsInHand.filter((card) =>
      card.type === CardType.EVENT && card.tags.includes(Tag.SPACE));
    if (spaceEvents.length === 0) {
      return undefined;
    }
    return new SelectCard('Select a Space event to copy to every player', 'Copy', spaceEvents)
      .andThen(([card]) => {
        for (const p of player.game.players) {
          p.cardsInHand.push(new DeimosDoubleDownCopy(card.name));
        }
        player.game.log('${0} gave every player a copy of ${1}', (b) => b.player(player).card(card));
        return undefined;
      });
  }
}

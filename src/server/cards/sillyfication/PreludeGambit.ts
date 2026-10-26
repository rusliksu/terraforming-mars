import {PreludeCard} from '../prelude/PreludeCard';
import {IPlayer} from '../../IPlayer';
import {IPreludeCard} from '../prelude/IPreludeCard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SelectCard} from '../../inputs/SelectCard';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {PreludesExpansion} from '../../preludes/PreludesExpansion';
import {digit} from '../Options';

export class PreludeGambit extends PreludeCard {
  constructor() {
    super({
      name: CardName.PRELUDE_GAMBIT,

      metadata: {
        cardNumber: 'T15',
        renderData: CardRenderer.builder((b) => {
          b.minus().cards(10, {digit}).nbsp.tr(1).br;
          b.prelude().asterix();
        }),
        description: 'Discard 10 cards. Gain 1 TR. Draw 6 Prelude cards. You may play up to 2 of them; discard the rest.',
      },
    });
  }

  /** Offer up to `picksLeft` more preludes to play, one at a time, from `choices`. Discards whatever's declined. */
  private offerPicks(player: IPlayer, choices: ReadonlyArray<IPreludeCard>, picksLeft: number) {
    const game = player.game;
    if (picksLeft <= 0 || choices.length === 0) {
      for (const c of choices) {
        game.preludeDeck.discard(c);
      }
      return undefined;
    }
    const title = picksLeft === 2 ?
      'Select a Prelude to play (1 of up to 2, optional)' :
      'Select another Prelude to play (optional)';
    return new SelectCard(title, 'Play', choices, {min: 0, max: 1})
      .andThen((selection) => {
        if (selection.length === 0) {
          for (const c of choices) {
            game.preludeDeck.discard(c);
          }
          return undefined;
        }
        const [chosen] = selection;
        if (chosen.canPlay?.(player) === false) {
          PreludesExpansion.fizzle(player, chosen);
        } else {
          player.playCard(chosen, undefined, 'add');
        }
        const remaining = choices.filter((c) => c !== chosen);
        player.defer(() => this.offerPicks(player, remaining, picksLeft - 1));
        return undefined;
      });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    player.increaseTerraformRating(1, {log: true});
    game.defer(new DiscardCards(player, 10, 10, 'Discard 10 cards')).andThen(() => {
      const drawn = game.preludeDeck.drawN(game, 6);
      player.defer(() => this.offerPicks(player, drawn, 2));
      return undefined;
    });
    return undefined;
  }
}

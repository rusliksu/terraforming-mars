import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {IGame} from '../../IGame';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {CardName} from '../../../common/cards/CardName';
import {ICard, IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {PlayerInput} from '../../PlayerInput';
import {Priority} from '../../deferredActions/Priority';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {DrawCards} from '../../deferredActions/DrawCards';
import {Resource} from '../../../common/Resource';
import {newProjectCard} from '../../createCard';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {all} from '../Options';
import {SerializedCard} from '../../SerializedCard';

/** How many cards deep from the top of the deck the action's planted Dead Drop can land. */
const PLANT_DEPTH = 8;

/**
 * A Pharmacy-Union-style flip corporation, built around Dead Drop (DeadDrop.ts) - an
 * otherwise-ordinary 0-cost event that this corp seeds extra copies of into the shared deck.
 * Front side: whoever plays a copy (owner or opponent, doesn't matter) pays out 5 M€ and flips
 * this card. Back side splits by who plays the NEXT copy: the owner gets to peek 2 cards deep
 * into the deck and keep one, an opponent costs the owner 1 TR and flips it back to the front.
 * No tags on either side.
 */
export class CutoutNetworks extends CorporationCard implements ICorporationCard, IActionCard {
  private flipped = false;

  constructor() {
    super({
      name: CardName.CUTOUT_NETWORKS,
      startingMegaCredits: 42,
      initialActionText: 'Shuffle 1 Dead Drop into the deck for every 20 cards in the deck, then every player draws 3 cards',

      metadata: {
        cardNumber: 'X51', // Renumber
        description: 'You start with 42 M€. As your first action, shuffle 1 copy of Dead Drop into the deck for every 20 cards in the deck. Every player draws 3 cards.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(42).br;
          b.cards(3, {all}).br;
          b.corpBox('effect-action', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.effect('FRONT. Whenever anyone plays Dead Drop, gain 5 M€, then flip this card.', (eb) => {
              eb.text('DEAD DROP', {size: Size.SMALL}).startEffect.megacredits(5);
            });
            ce.br;
            ce.action('Discard a card to hide a Dead Drop within the top 8 cards of the deck.', (ab) => {
              ab.minus().cards(1).startAction.cards(1);
            });
            ce.br;
            ce.vSpace();
            ce.br;
            ce.effect('BACK. Whenever you play Dead Drop, look at the top 2 cards of the deck and keep 1.', (eb) => {
              eb.text('YOU: DEAD DROP', {size: Size.SMALL}).startEffect.cards(2).asterix();
            });
            ce.br;
            ce.effect('Whenever an opponent plays Dead Drop, lose 1 TR, then flip this card back.', (eb) => {
              eb.text('THEM: DEAD DROP', {size: Size.SMALL}).startEffect.minus().tr(1);
            });
          });
        }),
      },
    });
  }

  public override get tags(): Array<Tag> {
    return [];
  }

  public override initialAction(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const count = Math.floor(game.projectDeck.size() / 20);
    for (let i = 0; i < count; i++) {
      const deadDrop = newProjectCard(CardName.DEAD_DROP) as IProjectCard;
      game.projectDeck.drawPile.push(deadDrop);
    }
    game.projectDeck.shuffle();
    if (count > 0) {
      game.log('${0} shuffled ${1} copy(s) of Dead Drop into the deck', (b) => b.player(player).number(count));
    }
    for (const p of game.players) {
      p.drawCard(3);
    }
    game.log('Every player drew 3 cards');
    return undefined;
  }

  public onCardPlayedByAnyPlayer(cardOwner: IPlayer, card: ICard, activePlayer: IPlayer): void {
    if (card.name !== CardName.DEAD_DROP) {
      return;
    }
    const player = cardOwner;
    if (!this.flipped) {
      player.defer(() => {
        player.stock.add(Resource.MEGACREDITS, 5, {log: true, from: {card: this}});
        this.flipped = true;
        player.game.log('${0} flipped ${1} to its back side', (b) => b.player(player).card(this));
        return undefined;
      }, Priority.DEFAULT);
      return;
    }
    if (activePlayer === player) {
      player.game.defer(DrawCards.keepSome(player, 2, {keepMax: 1}), Priority.DEFAULT);
    } else {
      player.defer(() => {
        player.decreaseTerraformRating(1, {log: true});
        this.flipped = false;
        player.game.log('${0} flipped ${1} back to its front side', (b) => b.player(player).card(this));
        return undefined;
      }, Priority.DEFAULT);
    }
  }

  public canAct(player: IPlayer): boolean {
    return !this.flipped && player.cardsInHand.length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    player.game.defer(new DiscardCards(player, 1, 1)).andThen(() => {
      plantDeadDropNearTop(player.game);
      return undefined;
    });
    return undefined;
  }

  public serialize(serialized: SerializedCard): void {
    serialized.data = {flipped: this.flipped};
  }

  public deserialize(serialized: SerializedCard): void {
    const data = serialized.data as {flipped?: boolean} | undefined;
    this.flipped = data?.flipped ?? false;
  }
}

/** Inserts a fresh Dead Drop somewhere within the top `PLANT_DEPTH` cards of the deck - the
 * array's own end is the top (see Deck.ts / PeerReview.ts), so this splices in at a random
 * index no further than `PLANT_DEPTH` from `drawPile.length`. */
function plantDeadDropNearTop(game: IGame): void {
  const drawPile = game.projectDeck.drawPile;
  const deadDrop = newProjectCard(CardName.DEAD_DROP) as IProjectCard;
  const depth = Math.min(PLANT_DEPTH, drawPile.length);
  const insertAt = drawPile.length - game.rng.nextInt(depth + 1);
  drawPile.splice(insertAt, 0, deadDrop);
  game.log('A Dead Drop was hidden near the top of the deck');
}

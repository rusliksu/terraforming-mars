import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {ICard} from '../../../cards/ICard';
import {IProjectCard} from '../../../cards/IProjectCard';
import {CardType} from '../../../../common/cards/CardType';
import {Resource} from '../../../../common/Resource';
import {Turmoil} from '../../Turmoil';
import {OrOptions} from '../../../inputs/OrOptions';
import {SelectOption} from '../../../inputs/SelectOption';
import {SelectCard} from '../../../inputs/SelectCard';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';
import {AltSecondaryTag} from '../../../../common/cards/render/AltSecondaryTag';

// More Parties (Belt Tightening Policy / "Renationalisation"):
// - "2 M€ for every two automated cards ... minus influence" is a strict pair-grouping penalty (2
//   M€ per complete pair of automated cards, not a continuous 1-M€-per-card rate: 3 cards costs 2
//   M€, not 3). There's also no Countable field for counting cards by CardType, so this whole
//   clause is computed by hand: subtract influence first (floored at 0, mirroring how `lose`
//   treats a negative count as zero), then floor-divide the remainder into pairs.
// - "discard one active card or two non-standard resources" is a genuine player choice between two
//   different kinds of loss (a whole played card vs. card resources), following the OrOptions
//   pattern used elsewhere in this batch (see ClosedBiospheres.ts, RadicalGeoengineering.ts).
//   "Non-standard resources" = CardResource-typed resources sitting on cards, as opposed to the six
//   standard Resource types (M€/steel/titanium/plants/energy/heat); `player.getCardsWithResources()`
//   with no type filter finds cards holding any of them. Either branch is omitted entirely if the
//   player has nothing eligible for it.
export class BeltTighteningPolicy extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.BELT_TIGHTENING_POLICY,
      description: 'Each player loses 2 M€ for every two automated cards they own, reduced by ' +
        'influence. Each player discards one active card or two non-standard resources.',
      revealedDelegate: PartyName.CENTRISTS,
      currentDelegate: PartyName.POPULISTS,
      renderData: CardRenderer.builder((b) => {
        b.minus().megacredits(2).slash().text('2 automated', {size: Size.SMALL}).minus().influence({size: Size.SMALL}).br;
        b.cards(1, {secondaryTag: AltSecondaryTag.BLUE}).or().text('2 resources', {size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const automatedCards = player.tableau.filter((card) => card.type === CardType.AUTOMATED).length;
    const reduced = Math.max(0, automatedCards - turmoil.getInfluence(player));
    const loss = 2 * Math.floor(reduced / 2);
    if (loss > 0) {
      player.stock.deduct(Resource.MEGACREDITS, loss, {log: true, from: {globalEvent: this}});
    }

    const activeCards: ReadonlyArray<IProjectCard> = player.playedCards.projects()
      .filter((card) => card.type === CardType.ACTIVE);
    const resourceCards: ReadonlyArray<ICard> = player.getCardsWithResources();

    const options: Array<SelectOption> = [];
    if (activeCards.length > 0) {
      options.push(new SelectOption('Discard an active card', 'Discard').andThen(() => {
        if (activeCards.length === 1) {
          player.discardPlayedCard(activeCards[0]);
          return undefined;
        }
        return new SelectCard('Select an active card to discard', 'Discard', activeCards)
          .andThen(([card]) => {
            player.discardPlayedCard(card);
            return undefined;
          });
      }));
    }
    if (resourceCards.length > 0) {
      options.push(new SelectOption('Discard two non-standard resources', 'Discard').andThen(() => {
        if (resourceCards.length === 1) {
          player.removeResourceFrom(resourceCards[0], 2, {removingPlayer: player, log: true});
          return undefined;
        }
        return new SelectCard('Select a card to remove 2 resources from', 'Discard', resourceCards)
          .andThen(([card]) => {
            player.removeResourceFrom(card, 2, {removingPlayer: player, log: true});
            return undefined;
          });
      }));
    }

    if (options.length > 0) {
      player.defer(new OrOptions(...options).setTitle('Discard one active card or two non-standard resources').reduce());
    }
  }
}

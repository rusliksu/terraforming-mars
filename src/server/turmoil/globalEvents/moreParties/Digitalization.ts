import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {IActionCard, ICard, isIActionCard, isIHasCheckLoops} from '../../../cards/ICard';
import {SelectCard} from '../../../inputs/SelectCard';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class Digitalization extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.DIGITALIZATION,
      description: 'Each player loses 2 M€ for every city and colony they own (max 5, then reduced by influence). ' +
        'Each player may use the action on up to 2 of their active cards again.',
      revealedDelegate: PartyName.TRANSHUMANISTS,
      currentDelegate: PartyName.SPOME,
      behavior: {
        lose: {
          stock: {
            megacredits: {
              cities: {},
              colonies: {colonies: {}},
              all: false,
              turmoil: {max: 5, influence: {subtract: true}},
              each: 2,
            },
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.minus().megacredits(2).slash().city().plus().colonies(1).influence({size: Size.SMALL}).br;
        b.text('Use up to 2 active card actions again', {size: Size.SMALL});
      }),
    });
  }

  /*
   * "Activate again" reuses the codebase's precedent for replaying an action a second time:
   * src/server/cards/corporatebetterments/FamilyAdvertising.ts ("Redo 2 used actions on 2 of
   * your active cards"). Unlike that card, Digitalization doesn't require the action to have
   * already been used this generation -- any active card the player can currently act with
   * is eligible.
   */
  private getActionCards(player: IPlayer): Array<IActionCard & ICard> {
    const result: Array<IActionCard & ICard> = [];
    for (const playedCard of player.tableau) {
      if (!isIActionCard(playedCard)) {
        continue;
      }
      if (isIHasCheckLoops(playedCard) && playedCard.getCheckLoops() >= 2) {
        continue;
      }
      if (playedCard.canAct(player)) {
        result.push(playedCard);
      }
    }
    return result;
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const actionCards = this.getActionCards(player);
    if (actionCards.length === 0) {
      return;
    }
    const max = Math.min(2, actionCards.length);

    player.defer(new SelectCard<IActionCard & ICard>(
      'Select up to 2 active cards to use their action again',
      'Take actions',
      actionCards,
      {max, min: 0})
      .andThen((cards) => {
        for (const card of cards) {
          player.game.log('${0} used ${1} action again because of Digitalization', (b) => b.player(player).card(card));
          player.defer(() => card.action(player));
        }
        return undefined;
      }));
  }
}

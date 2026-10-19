import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActiveCorporationCard} from '../corporation/CorporationCard';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {UnderworldExpansion} from '../../underworld/UnderworldExpansion';
import {SendDelegateToArea} from '../../deferredActions/SendDelegateToArea';
import {Turmoil} from '../../turmoil/Turmoil';
import {Size} from '../../../common/cards/render/Size';

/** A crime-and-politics corp: profits from bad press and turns corruption into influence. */
export class TheSyndicate extends ActiveCorporationCard {
  constructor() {
    super({
      name: CardName.THE_SYNDICATE,
      tags: [Tag.CRIME],
      startingMegaCredits: 50,
      victoryPoints: -5,

      behavior: {
        turmoil: {influenceBonus: 1},
      },

      action: {
        spend: {corruption: 1},
      },

      metadata: {
        cardNumber: 'XC5',
        description: 'You start with 50 M€ and 1 influence.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(50).nbsp.influence().br;
          b.corpBox('effect-action', (cea) => {
            cea.vSpace(Size.LARGE);
            cea.br;
            cea.effect('When you play a card with a negative VP icon, including this, gain 1 corruption and place a delegate.', (eb) => {
              eb.vpIcon().asterix().startEffect.corruption(1).nbsp.delegates(1);
            });
            cea.br;
            cea.action('Spend 1 corruption to permanently add 1 delegate to your reserve.', (ab) => {
              ab.corruption(1).startAction.delegates(1);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    const victoryPoints = card.metadata.victoryPoints;
    if (victoryPoints === undefined) {
      return;
    }
    const value = typeof victoryPoints === 'number' ? victoryPoints : victoryPoints.points;
    if (value >= 0) {
      return;
    }
    UnderworldExpansion.gainCorruption(player, 1, {log: true});
    player.game.defer(new SendDelegateToArea(player, 'Select where to send a delegate'));
  }

  public override bespokeAction(player: IPlayer) {
    Turmoil.ifTurmoil(player.game, (turmoil) => {
      turmoil.delegateReserve.add(player, 1);
      player.game.log('${0} added 1 delegate to their reserve', (b) => b.player(player));
    });
    return undefined;
  }
}

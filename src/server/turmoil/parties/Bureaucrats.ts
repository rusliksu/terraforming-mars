import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Bonus} from '../Bonus';
import {IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../../cards/ICard';
import {CardType} from '../../../common/cards/CardType';
import {Resource} from '../../../common/Resource';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {POLITICAL_AGENDAS_MAX_ACTION_USES} from '../../../common/constants';

/**
 * More Parties: Bureaucrats, one of the 6 new "Political Agendas" parties. Policy 1 originally
 * caps blue-card actions per generation, a mechanic this codebase has no equivalent of --
 * compromise: spend 5 M€ to buy the first Active card instead, matching the "buy the first X
 * card" pattern several other More Parties policies already use.
 */
export class Bureaucrats extends Party implements IParty {
  readonly name = PartyName.BUREAUCRATS;
  readonly bonuses = [BUREAUCRATS_BONUS_1, BUREAUCRATS_BONUS_2];
  readonly policies = [BUREAUCRATS_POLICY_1, BUREAUCRATS_POLICY_2, BUREAUCRATS_POLICY_3, BUREAUCRATS_POLICY_4];
}

class BureaucratsBonus01 extends Bonus {
  readonly id = 'burb01' as const;
  readonly description = 'Gain 2 M€ for every delegate you have in a party';

  getScore(player: IPlayer) {
    const turmoil = player.game.turmoil;
    if (turmoil === undefined) {
      return 0;
    }
    return turmoil.parties.reduce((sum, party) => sum + party.delegates.count(player), 0);
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player) * 2, {log: true, from: {partyName: PartyName.BUREAUCRATS}});
  }
}

// Adapted: the source also references "every Chairman bonus," an EPIC campaign concept this
// codebase doesn't model -- dropped, keeping only the influence-based scoring.
class BureaucratsBonus02 extends Bonus {
  readonly id = 'burb02' as const;
  readonly description = 'Gain 2 M€ for every influence you have';

  getScore(player: IPlayer) {
    const turmoil = player.game.turmoil;
    if (turmoil === undefined) {
      return 0;
    }
    return turmoil.getInfluence(player);
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player) * 2, {log: true, from: {partyName: PartyName.BUREAUCRATS}});
  }
}

// Compromise: original is "this generation you can take at most 2 actions on cards in play,
// plus the influence you have," which would require a new global per-generation action-cap
// mechanic this codebase doesn't have. Replaced with the "buy the first X card" pattern used by
// several sibling More Parties policies (e.g. Populists P4, Empower P4).
class BureaucratsPolicy01 implements IPolicy {
  readonly id = 'burp01' as const;
  readonly description = 'Action: spend 5 M€ to buy the first Active card (max 3 times per generation)';

  canAct(player: IPlayer): boolean {
    return player.canAfford(5) && player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES;
  }

  action(player: IPlayer) {
    const game = player.game;
    player.politicalAgendasActionUsedCount += 1;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.BUREAUCRATS));
    game.defer(new SelectPaymentDeferred(player, 5, {title: TITLES.payForPartyAction(PartyName.BUREAUCRATS)}))
      .andThen(() => player.drawCard(1, {cardType: CardType.ACTIVE}));
    return undefined;
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnTurnStartEffect, called from Game.startActionsForPlayer (the one place
// in the codebase that fires exactly once per player turn).
class BureaucratsPolicy02 implements IPolicy {
  readonly id = 'burp02' as const;
  readonly description = 'At the start of each turn, pay 3 M€ minus the influence you have (or as much as possible)';

  onTurnStart(player: IPlayer) {
    const turmoil = player.game.turmoil;
    const influence = turmoil === undefined ? 0 : turmoil.getInfluence(player);
    const required = Math.max(0, 3 - influence);
    if (required === 0) {
      return;
    }
    const amountToPay = Math.min(required, player.megaCredits);
    if (amountToPay > 0) {
      player.game.defer(new SelectPaymentDeferred(player, amountToPay, {title: 'Pay for Turmoil Bureaucrats (start of turn)'}));
    }
  }
}

// No behavior of its own -- its effect is applied directly by
// TurmoilHandler.applyOnDelegatePlacedEffect.
class BureaucratsPolicy03 implements IPolicy {
  readonly id = 'burp03' as const;
  readonly description = 'Every time you place a delegate, gain 3 M€';
}

class BureaucratsPolicy04 implements IPolicy {
  readonly id = 'burp04' as const;
  readonly description = 'Every time you play a card, discard a card. Does not apply to the chairman';

  onCardPlayed(player: IPlayer, _card: ICard) {
    const turmoil = player.game.turmoil;
    if (turmoil !== undefined && turmoil.chairman === player) {
      return;
    }
    player.game.defer(new DiscardCards(player, 1, 1, 'Select a card to discard (Turmoil Bureaucrats)'));
  }
}

export const BUREAUCRATS_BONUS_1 = new BureaucratsBonus01();
export const BUREAUCRATS_BONUS_2 = new BureaucratsBonus02();
export const BUREAUCRATS_POLICY_1 = new BureaucratsPolicy01();
export const BUREAUCRATS_POLICY_2 = new BureaucratsPolicy02();
export const BUREAUCRATS_POLICY_3 = new BureaucratsPolicy03();
export const BUREAUCRATS_POLICY_4 = new BureaucratsPolicy04();

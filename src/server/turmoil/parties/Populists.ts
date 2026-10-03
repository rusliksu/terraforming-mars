import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Bonus, IBonus} from '../Bonus';
import {IPolicy} from '../Policy';
import {IGame} from '../../IGame';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../../cards/ICard';
import {IProjectCard} from '../../cards/IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {SelectCard} from '../../inputs/SelectCard';
import {TITLES} from '../../inputs/titles';
import {POLITICAL_AGENDAS_MAX_ACTION_USES} from '../../../common/constants';
import {isSpecialTile} from '../../boards/Board';

/**
 * More Parties: Populists, one of the 6 new "Political Agendas" parties. Bonus B and policy 2
 * originally reference "population"/"sector"/"face-up faction card" -- concepts from an external
 * campaign expansion (EPIC) this codebase doesn't model. Bonus B is replaced with a compromise
 * (see its own comment); policy 2 is replaced with a real implementation of "return an Event
 * card to hand," matching the promo card Astra Mechanica's mechanic.
 */
export class Populists extends Party implements IParty {
  readonly name = PartyName.POPULISTS;
  readonly bonuses = [POPULISTS_BONUS_1, POPULISTS_BONUS_2];
  readonly policies = [POPULISTS_POLICY_1, POPULISTS_POLICY_2, POPULISTS_POLICY_3, POPULISTS_POLICY_4];
}

class PopulistsBonus01 extends Bonus {
  readonly id = 'popb01' as const;
  readonly description = 'Gain 1 M€ for every event you have played';

  getScore(player: IPlayer) {
    return player.getPlayedEventsCount();
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.POPULISTS}});
  }
}

// Compromise: original is "gain 2 M€ for every population and face-up faction card you have,"
// EPIC campaign concepts this codebase doesn't model. Replaced with a "leader gets a reward"
// bonus (same shape as the vanilla Reds bonuses) built on a stat this codebase does track --
// keep this comment if population/faction-card mechanics are ever added, to restore the original:
//   "Gain 2 M€ for every population and face-up faction card you have (EPIC campaign concepts)"
class PopulistsBonus02 implements IBonus {
  readonly id = 'popb02' as const;
  readonly description = 'The player(s) with the most Event cards played gains 1 TR';

  getScore(player: IPlayer) {
    return player.getPlayedEventsCount();
  }

  grant(game: IGame): void {
    const max = Math.max(...game.players.map((p) => this.getScore(p)));
    if (max === 0) {
      return;
    }
    game.players.forEach((player) => {
      if (this.getScore(player) === max) {
        player.increaseTerraformRating();
      }
    });
  }
}

class PopulistsPolicy01 implements IPolicy {
  readonly id = 'popp01' as const;
  readonly description = 'Every time you play a card worth VP (positive or negative), gain or pay twice that many M€';

  onCardPlayed(player: IPlayer, card: ICard) {
    const vp = card.getVictoryPoints(player);
    if (vp !== 0) {
      player.stock.add(Resource.MEGACREDITS, vp * 2, {log: true, from: {partyName: PartyName.POPULISTS}});
    }
  }
}

// Compromise: original is "action, pay 4 M€ to gain one population from any sector," EPIC
// campaign concepts this codebase doesn't model. Replaced with a real implementation of
// "return an Event card to hand," the same mechanic (and same excluded-card safety list, since
// it's the same underlying concern) as the promo card Astra Mechanica.
class PopulistsPolicy02 implements IPolicy {
  readonly id = 'popp02' as const;
  readonly description = 'Action: spend 5 M€ to return one of your played Event cards to your hand. It may not be a card that placed special tiles (max 3 times per generation)';

  // Mirrors AstraMechanica.UNUSABLE_CARDS: returning these to hand would leave the game in an
  // inconsistent state (they rely on staying in the tableau once played).
  private static UNUSABLE_CARDS = [
    CardName.PATENT_MANIPULATION,
    CardName.RETURN_TO_ABANDONED_TECHNOLOGY,
    CardName.HOSTILE_TAKEOVER,
  ];

  private getCards(player: IPlayer): ReadonlyArray<IProjectCard> {
    return player.playedCards.projects().filter((card) => {
      if (card.type !== CardType.EVENT) {
        return false;
      }
      if (PopulistsPolicy02.UNUSABLE_CARDS.includes(card.name)) {
        return false;
      }
      return !card.tilesBuilt.some(isSpecialTile);
    });
  }

  canAct(player: IPlayer): boolean {
    return player.canAfford(5) && player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES &&
      this.getCards(player).length > 0;
  }

  action(player: IPlayer) {
    const game = player.game;
    player.politicalAgendasActionUsedCount += 1;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.POPULISTS));
    game.defer(new SelectPaymentDeferred(player, 5, {title: TITLES.payForPartyAction(PartyName.POPULISTS)}))
      .andThen(() => {
        const cards = this.getCards(player);
        if (cards.length === 0) {
          return undefined;
        }
        player.defer(new SelectCard('Select an Event card to return to your hand', 'Select', cards)
          .andThen(([card]) => {
            player.playedCards.remove(card);
            player.cardsInHand.push(card);
            card.onDiscard?.(player);
            game.log('${0} returned ${1} to their hand', (b) => b.player(player).card(card));
            return undefined;
          }));
        return undefined;
      });
    return undefined;
  }
}

class PopulistsPolicy03 implements IPolicy {
  readonly id = 'popp03' as const;
  readonly description = 'Every time you play an Event card, draw 1 card';

  onCardPlayed(player: IPlayer, card: ICard) {
    if (card.type === CardType.EVENT) {
      player.drawCard(1);
    }
  }
}

// Adapted: the source describes this as choosing "the event tag," but no card in this codebase
// actually carries Tag.EVENT as a real tag (it's used only for rendering/counting purposes) --
// so this buys the first Event-*type* card instead, matching the evident intent.
class PopulistsPolicy04 implements IPolicy {
  readonly id = 'popp04' as const;
  readonly description = 'Action: spend 4 M€ to buy the first Event card (max 3 times per generation)';

  canAct(player: IPlayer): boolean {
    return player.canAfford(4) && player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES;
  }

  action(player: IPlayer) {
    const game = player.game;
    player.politicalAgendasActionUsedCount += 1;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.POPULISTS));
    game.defer(new SelectPaymentDeferred(player, 4, {title: TITLES.payForPartyAction(PartyName.POPULISTS)}))
      .andThen(() => player.drawCard(1, {cardType: CardType.EVENT}));
    return undefined;
  }
}

export const POPULISTS_BONUS_1 = new PopulistsBonus01();
export const POPULISTS_BONUS_2 = new PopulistsBonus02();
export const POPULISTS_POLICY_1 = new PopulistsPolicy01();
export const POPULISTS_POLICY_2 = new PopulistsPolicy02();
export const POPULISTS_POLICY_3 = new PopulistsPolicy03();
export const POPULISTS_POLICY_4 = new PopulistsPolicy04();

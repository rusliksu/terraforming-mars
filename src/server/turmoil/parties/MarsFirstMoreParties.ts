import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {Bonus} from '../Bonus';
import {IPlayer} from '../../IPlayer';
import {IPolicy} from '../Policy';
import {ICard} from '../../cards/ICard';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {TITLES} from '../../inputs/titles';
import {ChooseTagPolicy} from './ChooseTagPolicy';
import {MARS_FIRST_BONUS_2, MARS_FIRST_POLICY_1} from './MarsFirst';

const CITY_COST = 22;

/**
 * More Parties: the "Political Agendas" rework of Mars First. Bonus B and policy 1 are
 * identical to the official party (reused directly); the rest are new.
 */
export class MarsFirstMoreParties extends Party implements IParty {
  readonly name = PartyName.MARS;
  readonly bonuses = [MARS_FIRST_MORE_PARTIES_BONUS_1, MARS_FIRST_BONUS_2];
  readonly policies = [
    MARS_FIRST_POLICY_1,
    MARS_FIRST_MORE_PARTIES_POLICY_2,
    MARS_FIRST_MORE_PARTIES_POLICY_3,
    MARS_FIRST_MORE_PARTIES_POLICY_4,
  ];
}

class MarsFirstMorePartiesBonus01 extends Bonus {
  readonly id = 'mb01' as const;
  readonly description = 'Gain 1 M€ for every building and Mars tag you have';

  getScore(player: IPlayer) {
    return player.tags.count(Tag.BUILDING, 'raw') + player.tags.count(Tag.MARS, 'raw');
  }

  grantForPlayer(player: IPlayer): void {
    player.stock.add(Resource.MEGACREDITS, this.getScore(player), {log: true, from: {partyName: PartyName.MARS}});
  }
}

// No behavior of its own -- like the official mp02, its effect is applied directly by
// TurmoilHandler.applyOnCardPlayedEffect.
class MarsFirstMorePartiesPolicy02 implements IPolicy {
  readonly id = 'mp02' as const;
  readonly description = `Action: pay ${CITY_COST} M€ (steel usable) to place a city tile on Mars`;

  canAct(player: IPlayer): boolean {
    return player.canAfford({cost: CITY_COST, steel: true}) &&
      player.game.board.getAvailableSpacesForCity(player).length > 0;
  }

  action(player: IPlayer) {
    const game = player.game;
    game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(PartyName.MARS));
    game.defer(new SelectPaymentDeferred(player, CITY_COST, {canUseSteel: true, title: TITLES.payForPartyAction(PartyName.MARS)}))
      .andThen(() => {
        game.defer(new PlaceCityTile(player));
      });
    return undefined;
  }
}

class MarsFirstMorePartiesPolicy03 implements IPolicy {
  readonly id = 'mp03' as const;
  readonly description = 'When you play a card with a building tag or Mars tag, gain 2 M€';

  onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.includes(Tag.BUILDING) || card.tags.includes(Tag.MARS)) {
      player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {partyName: PartyName.MARS}});
    }
  }
}

export const MARS_FIRST_MORE_PARTIES_BONUS_1 = new MarsFirstMorePartiesBonus01();
export const MARS_FIRST_MORE_PARTIES_POLICY_2 = new MarsFirstMorePartiesPolicy02();
export const MARS_FIRST_MORE_PARTIES_POLICY_3 = new MarsFirstMorePartiesPolicy03();
export const MARS_FIRST_MORE_PARTIES_POLICY_4 = new ChooseTagPolicy('mp04', PartyName.MARS, 'building tag or Mars tag', () => [Tag.BUILDING, Tag.MARS]);

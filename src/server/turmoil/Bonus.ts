import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';
import {BonusId} from '../../common/turmoil/Types';
import {PartyName} from '../../common/turmoil/PartyName';
import {Resource} from '../../common/Resource';

// Represents a Turmoil Chairman bonus.
export interface IBonus {
  id: BonusId;
  description: string;
  grantForPlayer?(player: IPlayer): void;
  grant(game: IGame): void;
  getScore(player: IPlayer): number;
}

export abstract class Bonus implements IBonus {
  abstract id: BonusId;
  abstract description: string;
  public abstract grantForPlayer(player: IPlayer): void;
  public abstract getScore(player: IPlayer): number;

  protected grantResourceForRulingBonus(player: IPlayer, resource: Resource, amount: number, label: string, partyName: PartyName): void {
    player.stock.add(resource, amount);
    if (amount === 0) {
      return;
    }
    player.game.log('${0} gained ${1} ' + label + ' from Turmoil ${2} ruling bonus', (b) =>
      b.player(player).number(amount).partyName(partyName));
  }

  public grant(game: IGame): void {
    for (const player of game.playersInGenerationOrder) {
      if (player.alliedParty === undefined) {
        this.grantForPlayer?.(player);
      }
    }
  }
}

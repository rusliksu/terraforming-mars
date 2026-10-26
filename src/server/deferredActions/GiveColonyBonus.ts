import {IPlayer} from '../IPlayer';
import {NEUTRAL_COLONY_OWNER, PlayerId} from '../../common/Types';
import {IColony} from '../colonies/IColony';
import {DeferredAction} from './DeferredAction';
import {Priority} from './Priority';
import {MultiSet} from 'mnemonist';

export class GiveColonyBonus extends DeferredAction {
  private waitingFor = new MultiSet<PlayerId>();
  private playersWithBonuses = new Set<PlayerId>();

  constructor(
    player: IPlayer,
    public colony: IColony,
    public selfish: boolean = false, // Used for CoordinatedRaid.
  ) {
    super(player, Priority.DEFAULT);
  }

  public execute() {
    for (const playerId of this.colony.colonies) {
      // A sold colony slot (Colony Sale) belongs to no one - it gets no bonus.
      if (playerId === NEUTRAL_COLONY_OWNER) {
        continue;
      }
      if (!this.selfish) {
        // Normal behavior; colony owners get their bonuses.
        this.waitingFor.add(playerId);
        this.playersWithBonuses.add(playerId);
      } else {
        // Selfish behavior, `player` gets all the colony bonuses.
        this.waitingFor.add(this.player.id);
        this.playersWithBonuses.add(this.player.id);
      }
    }

    if (this.playersWithBonuses.size === 0) {
      this.cb(undefined);
      return undefined;
    }

    for (const playerId of this.waitingFor.keys()) {
      const bonusPlayer = this.player.game.getPlayerById(playerId);
      this.giveColonyBonus(bonusPlayer);
    }

    return undefined;
  }

  private giveColonyBonus(player: IPlayer): void {
    if (this.waitingFor.get(player.id) ?? 0 > 0) {
      this.waitingFor.remove(player.id);
      const input = this.colony.giveColonyBonus(player, true);
      if (input !== undefined) {
        player.setWaitingFor(input, () => this.giveColonyBonus(player));
      } else {
        this.giveColonyBonus(player);
      }
    } else {
      this.playersWithBonuses.delete(player.id);
      this.doneGettingBonus();
    }
  }

  private doneGettingBonus(): void {
    if (this.playersWithBonuses.size === 0) {
      this.cb(undefined);
    }
  }
}

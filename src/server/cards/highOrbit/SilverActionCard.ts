import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {getBehaviorExecutor} from '../../behavior/BehaviorExecutor';
import {SilverCard} from './SilverCard';

/**
 * High Orbit (fan): a Silver card with a data-defined `action` behavior.
 *
 * This duplicates ActionCard's boilerplate (see ActivePreludeCard for the same pattern used by
 * prelude cards) because a class can only extend one base, and every Silver card must extend
 * SilverCard for its shared tag/requirement/duplicate-ownership handling.
 */
export abstract class SilverActionCard extends SilverCard implements IActionCard {
  public canAct(player: IPlayer): boolean {
    if (this.properties.action === undefined) {
      throw new Error('action not defined');
    }
    if (!getBehaviorExecutor().canExecute(this.properties.action, player, this)) {
      return false;
    }
    return this.bespokeCanAct(player);
  }

  public action(player: IPlayer): PlayerInput | undefined {
    if (this.properties.action === undefined) {
      throw new Error('action not defined');
    }
    getBehaviorExecutor().execute(this.properties.action, player, this);
    return this.bespokeAction(player);
  }

  public bespokeCanAct(_player: IPlayer): boolean {
    return true;
  }

  public bespokeAction(_player: IPlayer): PlayerInput | undefined {
    return undefined;
  }
}

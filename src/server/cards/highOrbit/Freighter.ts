import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {IGame} from '../../IGame';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectColony} from '../../inputs/SelectColony';
import {LogHelper} from '../../LogHelper';
import {MAX_COLONY_TRACK_POSITION} from '../../../common/constants';
import {SilverCard} from './SilverCard';
import {Size} from '../../../common/cards/render/Size';

export class Freighter extends SilverCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FREIGHTER,
      cost: 3,

      resourceType: CardResource.ORE,

      metadata: {
        cardNumber: 'HO07',
        renderData: CardRenderer.builder((b) => {
          b.text(
            'ACTION: Lower any colony tile track 1 step. If this card has no ore on it, add 1 ore to it.',
            {size: Size.SMALL}).br;
          b.text(
            'OR: Remove 1 ore from this card to raise any colony tile track 1 step.',
            {size: Size.SMALL});
        }),
      },
    });
  }

  private increasable(game: IGame) {
    return game.colonies.filter((colony) => colony.isActive && colony.trackPosition < MAX_COLONY_TRACK_POSITION);
  }

  private decreasable(game: IGame) {
    return game.colonies.filter((colony) => colony.isActive && colony.trackPosition > colony.colonies.length);
  }

  public canAct(player: IPlayer): boolean {
    const game = player.game;
    const canLower = this.decreasable(game).length > 0;
    const canRaise = this.resourceCount > 0 && this.increasable(game).length > 0;
    return canLower || canRaise;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const options: Array<SelectOption> = [];

    const decreasable = this.decreasable(game);
    if (decreasable.length > 0) {
      options.push(new SelectOption('Lower a colony tile track 1 step', 'Lower').andThen(() => {
        player.defer(new SelectColony('Select which colony tile track to lower', 'Lower', decreasable)
          .andThen((colony) => {
            colony.decreaseTrack();
            LogHelper.logColonyTrackDecrease(player, colony);
            if (this.resourceCount === 0) {
              player.addResourceTo(this, {qty: 1, log: true});
            }
            return undefined;
          }));
        return undefined;
      }));
    }

    if (this.resourceCount > 0) {
      const increasable = this.increasable(game);
      if (increasable.length > 0) {
        options.push(new SelectOption('Remove 1 ore from this card to raise a colony tile track 1 step', 'Raise').andThen(() => {
          player.defer(new SelectColony('Select which colony tile track to raise', 'Raise', increasable)
            .andThen((colony) => {
              player.removeResourceFrom(this, 1);
              colony.increaseTrack();
              LogHelper.logColonyTrackIncrease(player, colony, 1);
              return undefined;
            }));
          return undefined;
        }));
      }
    }

    return new OrOptions(...options);
  }
}

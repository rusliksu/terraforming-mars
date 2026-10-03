import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {IGame} from '../../IGame';
import {CardName} from '../../../common/cards/CardName';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectColony} from '../../inputs/SelectColony';
import {LogHelper} from '../../LogHelper';
import {MAX_COLONY_TRACK_POSITION} from '../../../common/constants';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class MarketManipulationCb extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARKET_MANIPULATION_CB,
      tags: [Tag.EARTH],
      cost: 15,

      behavior: {
        production: {megacredits: 2},
      },

      metadata: {
        cardNumber: 'CB28',
        renderData: CardRenderer.builder((b) => {
          b.text('Action: Increase or decrease a colony tile track 1 step.', {size: Size.SMALL}).br;
          b.production((pb) => pb.megacredits(2));
        }),
        description: 'Increase your M€ production 2 steps.',
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
    return this.increasable(game).length > 0 || this.decreasable(game).length > 0;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const options: Array<SelectOption> = [];

    const increasable = this.increasable(game);
    if (increasable.length > 0) {
      options.push(new SelectOption('Increase a colony tile track 1 step', 'Increase').andThen(() => {
        player.defer(new SelectColony('Select which colony tile track to increase', 'Increase', increasable)
          .andThen((colony) => {
            colony.increaseTrack();
            LogHelper.logColonyTrackIncrease(player, colony, 1);
            return undefined;
          }));
        return undefined;
      }));
    }

    const decreasable = this.decreasable(game);
    if (decreasable.length > 0) {
      options.push(new SelectOption('Decrease a colony tile track 1 step', 'Decrease').andThen(() => {
        player.defer(new SelectColony('Select which colony tile track to decrease', 'Decrease', decreasable)
          .andThen((colony) => {
            colony.decreaseTrack();
            LogHelper.logColonyTrackDecrease(player, colony);
            return undefined;
          }));
        return undefined;
      }));
    }

    return new OrOptions(...options);
  }
}

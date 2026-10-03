import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {IGame} from '../../IGame';
import {ICard} from '../ICard';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectColony} from '../../inputs/SelectColony';
import {LogHelper} from '../../LogHelper';
import {MAX_COLONY_TRACK_POSITION} from '../../../common/constants';
import {all} from '../Options';

export class MartianStockExchange extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_STOCK_EXCHANGE,
      tags: [Tag.MARS, Tag.BUILDING],
      cost: 26,
      victoryPoints: 2,

      requirements: {tag: Tag.EARTH},

      behavior: {
        production: {megacredits: 3},
      },

      metadata: {
        cardNumber: '145',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any player plays an Event card, you may move any colony tile track 1 step up or down.', (eb) => {
            eb.tag(Tag.EVENT, {all}).startEffect.text('±1');
          }).br;
          b.production((pb) => pb.megacredits(3));
        }),
        description: 'Requires 1 Earth tag. Increase your M€ production 3 steps.',
      },
    });
  }

  private increasable(game: IGame) {
    return game.colonies.filter((colony) => colony.isActive && colony.trackPosition < MAX_COLONY_TRACK_POSITION);
  }

  private decreasable(game: IGame) {
    return game.colonies.filter((colony) => colony.isActive && colony.trackPosition > colony.colonies.length);
  }

  public onCardPlayedByAnyPlayer(thisCardOwner: IPlayer, card: ICard) {
    if (card.type !== CardType.EVENT) {
      return undefined;
    }

    const game = thisCardOwner.game;
    const increasable = this.increasable(game);
    const decreasable = this.decreasable(game);
    if (increasable.length === 0 && decreasable.length === 0) {
      return undefined;
    }

    const options: Array<SelectOption> = [];

    if (increasable.length > 0) {
      options.push(new SelectOption('Increase a colony tile track 1 step', 'Increase').andThen(() => {
        thisCardOwner.defer(new SelectColony('Select which colony tile track to increase', 'Increase', increasable)
          .andThen((colony) => {
            colony.increaseTrack();
            LogHelper.logColonyTrackIncrease(thisCardOwner, colony, 1);
            return undefined;
          }));
        return undefined;
      }));
    }

    if (decreasable.length > 0) {
      options.push(new SelectOption('Decrease a colony tile track 1 step', 'Decrease').andThen(() => {
        thisCardOwner.defer(new SelectColony('Select which colony tile track to decrease', 'Decrease', decreasable)
          .andThen((colony) => {
            colony.decreaseTrack();
            LogHelper.logColonyTrackDecrease(thisCardOwner, colony);
            return undefined;
          }));
        return undefined;
      }));
    }

    options.push(new SelectOption('Do not move a colony tile track', 'Skip'));

    thisCardOwner.defer(new OrOptions(...options));
    return undefined;
  }
}

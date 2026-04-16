import {CardName} from '../common/cards/CardName';
import {Resource} from '../common/Resource';
import {IPlayer} from './IPlayer';
import {ICard} from './cards/ICard';
import {Space} from './boards/Space';
import {TileType, tileTypeToString} from '../common/TileType';
import {IColony} from './colonies/IColony';
import {Logger} from './logs/Logger';
import {CardResource} from '../common/CardResource';

export class LogHelper {
  static logAddResource(player: IPlayer, card: ICard, qty: number = 1): void {
    let resourceType = 'resource(s)';

    if (card.resourceType) {
      resourceType = card.resourceType.toLowerCase() + '(s)';
    }

    player.game.log('${0} added ${1} ${2} to ${3}', (b) =>
      b.player(player).number(qty).string(resourceType).card(card));
  }

  static logRemoveResource(player: IPlayer, card: ICard, qty: number = 1, effect: string): void {
    let resourceType = 'resource(s)';

    if (card.resourceType) {
      resourceType = card.resourceType.toLowerCase() + '(s)';
    }

    player.game.log('${0} removed ${1} ${2} from ${3} to ${4}', (b) =>
      b.player(player).number(qty).string(resourceType).card(card).string(effect));
  }

  static logTilePlacement(player: IPlayer, space: Space, tileType: TileType) {
    this.logBoardTileAction(player, space, tileTypeToString[tileType] + ' tile');
  }

  static logBoardTileAction(player: IPlayer, space: Space, description: string, action: string = 'placed') {
    // Skip off-grid tiles
    if (space.x === -1 && space.y === -1) return;
    // Skip solo play random tiles
    if (player.name === 'neutral') return;

    player.game.log('${0} ${1} ${2} at ${3}', (b) =>
      b.player(player).string(action).string(description).space(space));
  }

  static logColonyTrackIncrease(player: IPlayer, colony: IColony, steps: number = 1) {
    player.game.log('${0} increased ${1} colony track ${2} step(s)', (b) =>
      b.player(player).colony(colony).number(steps));
  }

  static logColonyTrackDecrease(player: IPlayer, colony: IColony) {
    player.game.log('${0} decreased ${1} colony track 1 step', (b) =>
      b.player(player).colony(colony));
  }

  static logVenusIncrease(player: IPlayer, steps: number) {
    player.game.log('${0} raised the Venus scale ${1} step(s)', (b) => b.player(player).number(steps));
  }

  static logDiscardedCards(logger: Logger, cards: ReadonlyArray<ICard> | ReadonlyArray<CardName>) {
    logger.log('${0} card(s) were discarded', (b) => {
      b.rawString(cards.length.toString());
      for (const card of cards) {
        if (typeof card === 'string') {
          b.cardName(card);
        } else {
          b.card(card);
        }
      }
    });
  }

  static logCardAction(player: IPlayer, action: string, cards: ReadonlyArray<ICard> | ReadonlyArray<CardName>, privateMessage: boolean = false) {
    let message = '${0} ' + action + ' ';
    if (cards.length === 0) {
      message += 'no cards';
    } else {
      message += '${1}';
    }
    const options = privateMessage ? {reservedFor: player} : {};

    player.game.log(message, (b) => {
      if (privateMessage === false) {
        b.player(player);
      } else {
        b.string('You');
      }
      if (cards.length > 0) {
        b.cards(cards);
      }
    }, options);
  }

  static logPrivateCardSelection(
    player: IPlayer,
    action: string,
    picked: ReadonlyArray<ICard> | ReadonlyArray<CardName>,
    skipped: ReadonlyArray<ICard> | ReadonlyArray<CardName>,
  ) {
    const pickedCount = picked.length;
    const skippedCount = skipped.length;

    if (pickedCount > 0 && skippedCount > 0) {
      player.game.log('You ' + action + ' ${0} skipping ${1}', (b) => {
        b.cards(picked);
        b.cards(skipped);
      }, {reservedFor: player});
      return;
    }
    if (pickedCount > 0) {
      this.logCardAction(player, action, picked, true);
      return;
    }
    if (skippedCount > 0) {
      player.game.log('You skipped ${0}', (b) => b.cards(skipped), {reservedFor: player});
    }
  }

  static logDrawnCards(player: IPlayer, cards: ReadonlyArray<ICard> | ReadonlyArray<CardName>, privateMessage: boolean = false) {
    this.logCardAction(player, 'drew', cards, privateMessage);
  }
  static logStealFromNeutralPlayer(player: IPlayer, resource: Resource, amount: number) {
    player.game.log('${0} stole ${1} ${2} from the neutral player', (b) => b.player(player).number(amount).string(resource));
  }

  public static logMoveResource(player: IPlayer, resource: CardResource, from: ICard, to: ICard) {
    player.game.log('${0} moved 1 ${1} from ${2} to ${3}.', (b) => b.player(player).string(resource).card(from).card(to));
  }
}

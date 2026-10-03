import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Board} from '@/server/boards/Board';
import {Resource} from '@/common/Resource';
import {all} from '@/server/cards/Options';
import {Size} from '@/common/cards/render/Size';

export class WeatherControlCB extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.WEATHER_CONTROL_CB,
      tags: [],
      cost: 6,

      metadata: {
        cardNumber: 'CB08',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(2).slash().text('tile on Mars', {size: Size.SMALL}).br;
          b.megacredits(1, {all}).slash().text('tile on Mars', {size: Size.SMALL});
        }),
        description: 'Gain 2 M€ for each tile you own on Mars. Each other player gains 1 M€ for each tile they own on Mars.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const p of game.players) {
      const tiles = game.board.spaces
        .filter(Board.ownedBy(p))
        .filter(Board.hasRealTile).length;
      if (tiles > 0) {
        const rate = p.id === player.id ? 2 : 1;
        p.stock.add(Resource.MEGACREDITS, tiles * rate, {log: true, from: {card: this}});
      }
    }
    return undefined;
  }
}

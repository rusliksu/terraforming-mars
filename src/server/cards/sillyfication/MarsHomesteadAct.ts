import {Tag} from '../../../common/cards/Tag';
import {PreludeCard} from '../prelude/PreludeCard';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {BoardType} from '../../boards/BoardType';
import {CITY_TILES} from '../../../common/TileType';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SimpleDeferredAction} from '../../deferredActions/DeferredAction';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {all} from '../Options';

export class MarsHomesteadAct extends PreludeCard {
  constructor() {
    super({
      name: CardName.MARS_HOMESTEAD_ACT,
      tags: [Tag.CITY, Tag.BUILDING, Tag.MARS],

      metadata: {
        cardNumber: 'T17',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any city tile is placed, its owner gains 2 M€ and you gain 1 M€ production.', (eb) => {
            eb.city({all}).startEffect.megacredits(2, {all}).nbsp.production((pb) => pb.megacredits(1));
          }).br;
          b.text('Then, each player, starting with you, may place a city tile on Mars.');
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const order = [...game.players];
    const startIdx = order.findIndex((p) => p.id === player.id);
    const rotated = [...order.slice(startIdx), ...order.slice(0, startIdx)];
    this.offerCity(rotated, 0);
    return undefined;
  }

  private offerCity(players: ReadonlyArray<IPlayer>, idx: number): void {
    if (idx >= players.length) {
      return;
    }
    const target = players[idx];
    const game = target.game;
    game.defer(new SimpleDeferredAction(target, () =>
      new OrOptions(
        new SelectOption('Place a city tile on Mars').andThen(() => {
          game.defer(new PlaceCityTile(target, {title: 'Select space for city'})).andThen(() => {
            this.offerCity(players, idx + 1);
            return undefined;
          });
          return undefined;
        }),
        new SelectOption('Skip').andThen(() => {
          this.offerCity(players, idx + 1);
          return undefined;
        }),
      )));
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType) {
    if (boardType !== BoardType.MARS || space.tile === undefined || !CITY_TILES.has(space.tile.tileType)) {
      return;
    }
    activePlayer.stock.add(Resource.MEGACREDITS, 2, {log: true});
    cardOwner.production.add(Resource.MEGACREDITS, 1, {log: true});
  }
}

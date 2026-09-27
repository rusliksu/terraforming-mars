import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardResource} from '../../../common/CardResource';
import {TileType} from '../../../common/TileType';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {CanAffordOptions, IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {PlaceTile} from '../../deferredActions/PlaceTile';
import {CardRenderer} from '../render/CardRenderer';

export class MobileBiologicalDome extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MOBILE_BIOLOGICAL_DOME,
      tags: [Tag.PLANT, Tag.BUILDING],
      cost: 16,
      resourceType: CardResource.SEED,

      requirements: {party: PartyName.SPOME},

      adjacencyBonus: {bonus: [SpaceBonus.PLANT]},

      metadata: {
        cardNumber: 'H06',
        renderData: CardRenderer.builder((b) => {
          b.effect(
            'During production, add 1 seed to this card. When there are 3 seeds here, remove them to place ' +
            'a greenery tile where the Biological Dome tile stands, then move the Biological Dome tile to an ' +
            'adjacent empty area. If no such area exists, remove the Biological Dome tile.',
            (eb) => eb.empty().startEffect.resource(CardResource.SEED));
          b.br;
          b.tile(TileType.BIOLOGICAL_DOME).asterix();
        }),
        description: 'Requires that Spome are ruling or that you have 2 delegates there. ' +
          'Place the Biological Dome special tile. Adjacency bonus 1 plant.',
      },
    });
  }

  private getAvailableSpaces(player: IPlayer, canAffordOptions?: CanAffordOptions): ReadonlyArray<Space> {
    return player.game.board.getAvailableSpacesOnLand(player, canAffordOptions);
  }

  public override bespokeCanPlay(player: IPlayer, canAffordOptions: CanAffordOptions): boolean {
    return this.getAvailableSpaces(player, canAffordOptions).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    player.game.defer(
      new PlaceTile(player, {
        tile: {tileType: TileType.BIOLOGICAL_DOME, card: this.name},
        on: () => this.getAvailableSpaces(player),
        title: 'Select space for the Biological Dome tile',
        adjacencyBonus: this.adjacencyBonus,
      }));
    return undefined;
  }

  public onProductionPhase(player: IPlayer): void {
    player.addResourceTo(this, {qty: 1, log: true});
    if (this.resourceCount < 3) {
      return;
    }
    player.removeResourceFrom(this, 3, {log: true});

    const game = player.game;
    const board = game.board;
    const domeSpace = board.getSpaceByTileCard(CardName.MOBILE_BIOLOGICAL_DOME);
    if (domeSpace === undefined) {
      // The tile was already removed in an earlier generation; the seeds accumulated for nothing.
      return;
    }

    const validDestinations = new Set(this.getAvailableSpaces(player));
    const nextSpace = board.getAdjacentSpaces(domeSpace).find((space) => validDestinations.has(space));

    game.removeTile(domeSpace.id);
    game.addGreenery(player, domeSpace);
    game.log('${0} converted the Biological Dome\'s area into a greenery', (b) => b.player(player));

    if (nextSpace === undefined) {
      game.log('${0} found no empty area to move the Biological Dome to, so it was removed', (b) => b.player(player));
      return;
    }
    game.addTile(player, nextSpace, {tileType: TileType.BIOLOGICAL_DOME, card: this.name});
    nextSpace.adjacency = this.adjacencyBonus;
    game.log('${0} moved the Biological Dome tile to an adjacent area', (b) => b.player(player));
  }
}

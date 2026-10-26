import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {TileType} from '../../../common/TileType';
import {MoonExpansion} from '../../moon/MoonExpansion';
import {moonHabitatTile} from '../render/DynamicVictoryPoints';

/**
 * Sideralis (Solaris, fan): "an off-world City" is interpreted as a Moon habitat tile --
 * MoonExpansion.calculateVictoryPoints already refers to habitat tiles as "colony" tiles,
 * and they're the established analog to a City off the Mars surface (see also
 * TheGrandLunaCapitalGroup, which scores VP off the same tile type). The card is
 * registered with `compatibility: 'moon'` in the manifest since it's meaningless without
 * The Moon expansion enabled.
 */
export class Sideralis extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SIDERALIS,
      tags: [Tag.JOVIAN, Tag.CITY],
      cost: 29,

      requirements: {habitatTiles: 1},
      victoryPoints: 'special',

      behavior: {
        production: {titanium: 1, megacredits: 4},
        moon: {habitatTile: {}},
      },

      metadata: {
        cardNumber: 'SOL11',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(1).megacredits(4)).br;
          b.moonHabitat().br;
          b.vpText('1 VP for each off-world City (habitat tile) you own.');
        }),
        description: 'Requires that you own an off-world City (a habitat tile on The Moon). Increase your titanium production 1 step and your M€ production 4 steps. Place a habitat tile on The Moon and raise the habitat rate 1 step.',
        victoryPoints: moonHabitatTile(1),
      },
    });
  }

  public override getVictoryPoints(player: IPlayer): number {
    return MoonExpansion.spaces(player.game, TileType.MOON_HABITAT, {surfaceOnly: true, ownedBy: player}).length;
  }
}

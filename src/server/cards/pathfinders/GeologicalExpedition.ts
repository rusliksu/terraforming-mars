import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Tag} from '../../../common/cards/Tag';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {IPlayer} from '../../IPlayer';
import {BoardType} from '../../boards/BoardType';
import {Space} from '../../boards/Space';
import {Resource} from '../../../common/Resource';
import {CardResource} from '../../../common/CardResource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {Priority} from '../../deferredActions/Priority';
import {SpaceType} from '../../../common/boards/SpaceType';
import {Phase} from '../../../common/Phase';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';

const VALID_BONUSES: Array<SpaceBonus> = [
  SpaceBonus.TITANIUM,
  SpaceBonus.STEEL,
  SpaceBonus.PLANT,
  SpaceBonus.HEAT,
  SpaceBonus.MEGACREDITS,
  SpaceBonus.ANIMAL,
  SpaceBonus.MICROBE,
  SpaceBonus.ENERGY,
  SpaceBonus.DATA,
  SpaceBonus.SCIENCE,
];

export class GeologicalExpedition extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GEOLOGICAL_EXPEDITION,
      cost: 18,
      tags: [Tag.MARS, Tag.SCIENCE],
      victoryPoints: 2,

      metadata: {
        cardNumber: 'Pf17',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you place a tile ON MARS gain 1 additional resource on the space. If the space has no bonus, gain 1 steel.', (eb) => {
            eb.emptyTile().startEffect.plus().wild(1).or().steel(1).asterix();
          }).br;
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType) {
    if (boardType !== BoardType.MARS || space.spaceType === SpaceType.COLONY) {
      return;
    }
    if (cardOwner !== activePlayer) {
      return;
    }
    if (cardOwner.game.phase === Phase.SOLAR) {
      return;
    }
    // Don't grant bonuses when overplacing.
    if (space.tile?.covers !== undefined) {
      return;
    }

    const bonuses = space.bonus;
    if (bonuses.length === 0) {
      activePlayer.stock.add(Resource.STEEL, 1, {log: true, from: {card: this}});
      return;
    }
    const filtered = bonuses.filter((bonus) => VALID_BONUSES.includes(bonus));
    const unique = Array.from(new Set(filtered));
    const options = new OrOptions().setTitle('Select an additional bonus from this space');
    unique.forEach((bonus) => {
      options.options.push(new SelectOption(
        SpaceBonus.toString(bonus),
        'Select')
        .andThen(() => {
          this.grantBonus(activePlayer, bonus);
          return undefined;
        }));
    });
    if (options.options.length === 1) {
      options.options[0].cb();
      return;
    }
    if (options.options.length === 0) {
      // should not happen.
      return;
    }
    activePlayer.defer(options, Priority.GAIN_RESOURCE_OR_PRODUCTION);
  }

  private grantBonus(player: IPlayer, bonus: SpaceBonus) {
    const from = {card: this};
    switch (bonus) {
    case SpaceBonus.TITANIUM:
      player.stock.add(Resource.TITANIUM, 1, {log: true, from});
      break;
    case SpaceBonus.STEEL:
      player.stock.add(Resource.STEEL, 1, {log: true, from});
      break;
    case SpaceBonus.PLANT:
      player.stock.add(Resource.PLANTS, 1, {log: true, from});
      break;
    case SpaceBonus.HEAT:
      player.stock.add(Resource.HEAT, 1, {log: true, from});
      break;
    case SpaceBonus.MEGACREDITS:
      player.stock.add(Resource.MEGACREDITS, 1, {log: true, from});
      break;
    case SpaceBonus.ENERGY:
      player.stock.add(Resource.ENERGY, 1, {log: true, from});
      break;
    case SpaceBonus.MICROBE:
      player.game.defer(new AddResourcesToCard(player, CardResource.MICROBE, {from}));
      break;
    case SpaceBonus.ANIMAL:
      player.game.defer(new AddResourcesToCard(player, CardResource.ANIMAL, {from}));
      break;
    case SpaceBonus.DATA:
      player.game.defer(new AddResourcesToCard(player, CardResource.DATA, {from}));
      break;
    case SpaceBonus.SCIENCE:
      player.game.defer(new AddResourcesToCard(player, CardResource.SCIENCE, {from}));
      break;
    }
  }
}

import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {Space} from '../../boards/Space';
import {SpaceBonus} from '../../../common/boards/SpaceBonus';
import {CardName} from '../../../common/cards/CardName';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {digit} from '../Options';

/** How many empty areas receive a silver-cube bonus marker. */
const AREA_COUNT = 3;
/** M€ bonus granted to whoever places a tile on a marked area. */
const BONUS_PER_AREA = 5;

export class PreciousMetalAsteroid extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.PRECIOUS_METAL_ASTEROID,
      tags: [Tag.SPACE],
      cost: 16,

      behavior: {
        global: {temperature: 1},
        stock: {megacredits: 5},
        removeAnyPlants: 3,
      },

      metadata: {
        cardNumber: 'I02',
        renderData: CardRenderer.builder((b) => {
          b.temperature(1).megacredits(5).br;
          b.minus().plants(3, {digit});
          b.br;
          b.text(
            `Place silver cubes on ${AREA_COUNT} empty areas on Mars. Players placing tiles on these areas ` +
            `collect an additional bonus of ${BONUS_PER_AREA} M€.`,
            {size: Size.SMALL, uppercase: true});
        }),
        description: 'Raise temperature 1 step. Gain 5 M€, place silver cubes on 3 non-reserved areas ' +
          `(worth ${BONUS_PER_AREA} M€ each to whoever tiles there). Remove up to 3 plants from a player.`,
      },
    });
  }

  private availableSpaces(player: IPlayer, excluded: ReadonlyArray<Space>): ReadonlyArray<Space> {
    return player.game.board.getAvailableSpacesForType(player, 'land')
      .filter((space) => !excluded.includes(space));
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.availableSpaces(player, []).length >= AREA_COUNT;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    return this.pick(player, []);
  }

  private pick(player: IPlayer, chosen: ReadonlyArray<Space>): PlayerInput | undefined {
    const remaining = AREA_COUNT - chosen.length;
    const spaces = this.availableSpaces(player, chosen);
    if (remaining <= 0 || spaces.length === 0) {
      return undefined;
    }

    return new SelectSpace('Select an empty area to place silver cubes on', spaces)
      .andThen((space) => {
        for (let i = 0; i < BONUS_PER_AREA; i++) {
          space.bonus.push(SpaceBonus.MEGACREDITS);
        }
        player.game.log('${0} placed silver cubes at ${1}, granting a ${2} M€ tile-placement bonus there',
          (b) => b.player(player).space(space).number(BONUS_PER_AREA));

        const next = this.pick(player, [...chosen, space]);
        if (next !== undefined) {
          player.defer(next);
        }
        return undefined;
      });
  }
}

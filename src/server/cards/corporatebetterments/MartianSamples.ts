import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SpaceId} from '../../../common/Types';
import {Space} from '../../boards/Space';
import {BoardType} from '../../boards/BoardType';
import {SelectSpace} from '../../inputs/SelectSpace';
import {GainResourcesDeferred} from '../../deferredActions/GainResourcesDeferred';
import {LogHelper} from '../../LogHelper';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {max, uppercase} from '../Options';

const MESSAGES = ['Select first area to claim', 'Select second area to claim', 'Select third area to claim'];

/**
 * Reserves three Mars areas for the player, patterned after Land Claim / Sand Claim.
 *
 * Unlike those cards, a bonus resource is collected each time the player places a tile
 * on one of the three reserved areas, so the claimed space IDs are tracked in `data`
 * so `onTilePlaced` can tell a Martian Samples claim from an ordinary tile placement.
 */
export class MartianSamples extends Card implements IProjectCard {
  public data: Array<SpaceId> = [];

  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_SAMPLES,
      tags: [Tag.MARS],
      cost: 6,

      requirements: {oxygen: 4, max},

      metadata: {
        cardNumber: 'CB46',
        renderData: CardRenderer.builder((b) => {
          b.text('Place your markers on 3 non-reserved areas. Only you may place tiles there.', {size: Size.SMALL, uppercase}).br;
          b.effect('When you place a tile on one of these areas, gain 2 M€.', (eb) => {
            eb.startEffect.megacredits(2);
          });
        }),
        description: 'Requires 4% oxygen or lower.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getNonReservedLandSpaces().length >= 3;
  }

  private selectSpace(player: IPlayer, claimed: number): SelectSpace | undefined {
    const spaces = player.game.board.getNonReservedLandSpaces();
    if (spaces.length === 0) {
      return undefined;
    }
    return new SelectSpace(MESSAGES[claimed], spaces)
      .andThen((space) => {
        space.player = player;
        this.data.push(space.id);
        LogHelper.logBoardTileAction(player, space, 'Martian Samples claim');
        if (claimed === 2) {
          return undefined;
        }
        return this.selectSpace(player, claimed + 1);
      });
  }

  public override bespokePlay(player: IPlayer) {
    return this.selectSpace(player, 0);
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType) {
    if (boardType !== BoardType.MARS || cardOwner.id !== activePlayer.id) {
      return;
    }
    const idx = this.data.indexOf(space.id);
    if (idx === -1) {
      return;
    }
    this.data.splice(idx, 1);
    cardOwner.game.defer(new GainResourcesDeferred(cardOwner, Resource.MEGACREDITS, {count: 2, log: true}));
  }
}

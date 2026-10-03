import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardName} from '../../../common/cards/CardName';
import {LogHelper} from '../../LogHelper';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';

const MESSAGES = ['Select first space to claim', 'Select second space to claim', 'Select third space to claim'];

/** Like Land Claim, but three spaces at once - still no placement bonus, just three
 * reserved markers guaranteeing the owner is the only one who may place a tile there. */
export class SandClaim extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SAND_CLAIM,
      cost: 3,

      metadata: {
        cardNumber: 'X83',
        renderData: CardRenderer.builder((b) => {
          b.text('Place your markers on 3 non-reserved areas. Only you may place a tile there.', {size: Size.SMALL, uppercase});
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getNonReservedLandSpaces().length > 0;
  }

  private selectSpace(player: IPlayer, claimed: number): SelectSpace | undefined {
    const spaces = player.game.board.getNonReservedLandSpaces();
    if (spaces.length === 0) {
      return undefined;
    }
    return new SelectSpace(MESSAGES[claimed], spaces)
      .andThen((space) => {
        space.player = player;
        LogHelper.logBoardTileAction(player, space, 'sand claim');
        if (claimed === 2) {
          return undefined;
        }
        return this.selectSpace(player, claimed + 1);
      });
  }

  public override bespokePlay(player: IPlayer) {
    return this.selectSpace(player, 0);
  }
}

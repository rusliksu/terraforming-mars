import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {DeltaProjectExpansion, VP2_POSITION} from '../../delta/DeltaProjectExpansion';
import {Size} from '../../../common/cards/render/Size';

export class CorporateEspionage extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.CORPORATE_ESPIONAGE,
      cost: 5,

      metadata: {
        cardNumber: 'DP12',
        renderData: CardRenderer.builder((b) => {
          b.minus(Size.SMALL).plate('Delta track').nbsp.plus(Size.SMALL).plate('Delta track').asterix();
        }),
        description: 'Reduce another player\'s Delta Project track by 1 step (unless they are already at the VP level). ' +
          'Increase your Delta Project track by 1 step - you may ignore 1 required tag. Both players receive the bonus ' +
          'associated with their resulting position.',
      },
    });
  }

  private targets(player: IPlayer): ReadonlyArray<IPlayer> {
    return player.opponents.filter((p) => {
      const pos = p.deltaProjectData?.position;
      return pos !== undefined && pos >= 1 && pos < VP2_POSITION;
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return this.targets(player).length > 0;
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    return new SelectPlayer(this.targets(player), 'Select player to target', 'Select').andThen((target) => {
      DeltaProjectExpansion.forceRetreatOneStep(target, 'primary');
      DeltaProjectExpansion.forceAdvanceOneStep(player, 'primary', {ignoreTag: true});
      player.game.log('${0} used ${1} to sabotage ${2}\'s Delta Project progress', (b) => b.player(player).card(this).player(target));
      return undefined;
    });
  }
}

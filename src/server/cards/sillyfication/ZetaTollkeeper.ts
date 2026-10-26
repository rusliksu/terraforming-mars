import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {DeltaProjectExpansion, DELTA_TRACK_TAGS} from '../../delta/DeltaProjectExpansion';
import {Size} from '../../../common/cards/render/Size';

/** Re-triggers its owner's current Delta Project position bonus, without moving the
 * marker, on demand via its own action. */
export class ZetaTollkeeper extends CorporationCard implements ICorporationCard, IActionCard {
  constructor() {
    super({
      name: CardName.ZETA_TOLLKEEPER,
      tags: [],
      startingMegaCredits: 14,

      behavior: {
        production: {megacredits: 6},
      },

      metadata: {
        cardNumber: 'DP13',
        description: 'You start with 14 M€ and 6 M€ production.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(14).nbsp.production((pb) => pb.megacredits(6)).br;
          b.corpBox('action', (ca) => {
            ca.vSpace(Size.LARGE);
            ca.br;
            ca.action('Gain your current Delta Project position\'s bonus again.', (ab) => {
              ab.empty().startAction.plate('Delta track').asterix();
            });
          });
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    const position = player.deltaProjectData?.position ?? 0;
    return DELTA_TRACK_TAGS[position] !== undefined;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const position = player.deltaProjectData?.position ?? 0;
    DeltaProjectExpansion.grantRewardForPosition(player, position, 'primary');
    player.game.log('${0} used Zeta Tollkeeper to gain their Delta Project position bonus again', (b) => b.player(player));
    return undefined;
  }
}

import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class ElectoralCampaign extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ELECTORAL_CAMPAIGN,
      tags: [],
      cost: 0,

      requirements: {party: PartyName.CENTRISTS},

      behavior: {
        stock: {megacredits: 7},
      },

      metadata: {
        cardNumber: 'H67',
        renderData: CardRenderer.builder((b) => {
          b.tr(1, {all}).megacredits(7);
        }),
        description: 'Requires that the Centrists are ruling or that you have 2 delegates there. ' +
          'All players raise their TR 1 step. Gain 7 M€.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    for (const p of player.game.players) {
      p.increaseTerraformRating();
    }
    return undefined;
  }
}

import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';
import {PreludesExpansion} from '../../preludes/PreludesExpansion';

export class RedistributionOfWealth extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 3,
      tags: [Tag.EARTH],
      name: CardName.REDISTRIBUTION_OF_WEALTH,
      type: CardType.AUTOMATED,

      requirements: {party: PartyName.POPULISTS},

      behavior: {
        production: {titanium: -1},
        lose: {stock: {megacredits: 1}},
      },

      metadata: {
        cardNumber: 'SOL21',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.minus().titanium(1)).nbsp.megacredits(-1).br;
          b.prelude();
        }),
        description: 'Requires that Populists are ruling or that you have 2 delegates there. ' +
          'Decrease your Titanium production 1 step and lose 1 M€. Draw a Prelude card and immediately play it.',
      },
    });
  }

  // Same soft-warn (never blocks canPlay), following the precedent set by NewPartner (promo),
  // which also draws prelude cards mid-game outside the deal-in phase.
  public override bespokeCanPlay(player: IPlayer) {
    if (!player.game.preludeDeck.canDraw(1)) {
      this.addWarning('deckTooSmall');
    }
    return true;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const cards = game.preludeDeck.drawN(game, 1);
    return PreludesExpansion.selectPreludeToPlay(player, cards);
  }
}

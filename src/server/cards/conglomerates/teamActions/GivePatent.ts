import {StandardProjectCard} from '../../StandardProjectCard';
import {CardName} from '../../../../common/cards/CardName';
import {CardRenderer} from '../../render/CardRenderer';
import {IPlayer} from '../../../IPlayer';
import {SelectCard} from '../../../inputs/SelectCard';
import {inplaceRemove} from '../../../../common/utils/utils';
import {ConglomeratesExpansion} from '../../../conglomerates/ConglomeratesExpansion';

export class GivePatent extends StandardProjectCard {
  constructor() {
    super({
      name: CardName.GIVE_PATENT,
      cost: 0,
      metadata: {
        cardNumber: 'TA1',
        renderData: CardRenderer.builder((b) => {
          b.standardProject(
            'Give a card from your hand to your teammate. Increases this cost by 1 Coordination ' +
            'for you for the rest of the generation.', (eb) => {
              eb.coordination(2).startAction.cards(1, {teammate: true}).asterix();
            });
        }),
      },
    });
  }

  private currentCost(player: IPlayer): number {
    return ConglomeratesExpansion.getTeamActionCost(player, 'givePatent');
  }

  public override canAct(player: IPlayer): boolean {
    if (player.teammates().length === 0) {
      return false;
    }
    if (player.cardsInHand.length === 0) {
      return false;
    }
    if (player.conglomeratesData.coordination < this.currentCost(player)) {
      return false;
    }
    return super.canAct(player);
  }

  actionEssence(player: IPlayer): void {
    const teammate = player.teammates()[0];
    player.defer(
      new SelectCard(
        'Select a card to give to your teammate',
        'Give',
        player.cardsInHand,
      ).andThen(([card]) => {
        ConglomeratesExpansion.spendCoordination(player, this.currentCost(player), {log: true});
        inplaceRemove(player.cardsInHand, card);
        teammate.cardsInHand.push(card);
        player.game.log('${0} gave ${1} to ${2}', (b) => b.player(player).card(card).player(teammate));
        ConglomeratesExpansion.increaseTeamActionCost(player, 'givePatent');
        return undefined;
      }),
    );
  }
}

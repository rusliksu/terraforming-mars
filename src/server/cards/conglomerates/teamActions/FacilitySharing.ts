import {StandardProjectCard} from '../../StandardProjectCard';
import {CardName} from '../../../../common/cards/CardName';
import {CardType} from '../../../../common/cards/CardType';
import {CardRenderer} from '../../render/CardRenderer';
import {IPlayer} from '../../../IPlayer';
import {ICard, IActionCard, isIActionCard} from '../../ICard';
import {OrOptions} from '../../../inputs/OrOptions';
import {SelectOption} from '../../../inputs/SelectOption';
import {ConglomeratesExpansion} from '../../../conglomerates/ConglomeratesExpansion';
import {Resource} from '../../../../common/Resource';

export class FacilitySharing extends StandardProjectCard {
  constructor() {
    super({
      name: CardName.FACILITY_SHARING,
      cost: 0,
      metadata: {
        cardNumber: 'TA2',
        renderData: CardRenderer.builder((b) => {
          b.standardProject(
            'Use one of your teammate\'s unused action cards (not their corporation) as if it were yours. ' +
            'Increases this cost by 1 Coordination for you for the rest of the generation.', (eb) => {
              eb.coordination(1).startAction.teammateArrow().asterix();
            });
        }),
      },
    });
  }

  private currentCost(player: IPlayer): number {
    return ConglomeratesExpansion.getTeamActionCost(player, 'facilitySharing');
  }

  private sharableCards(player: IPlayer, teammate: IPlayer): Array<ICard & IActionCard> {
    const allowCorporation = teammate.tableau.has(CardName.FULL_ACCESS_COOPERATION);
    const result: Array<ICard & IActionCard> = [];
    for (const card of teammate.tableau) {
      const eligibleType = card.type === CardType.ACTIVE || (allowCorporation && card.type === CardType.CORPORATION);
      if (!eligibleType) {
        continue;
      }
      if (teammate.actionsThisGeneration.has(card.name)) {
        continue;
      }
      if (isIActionCard(card) && card.canAct(player)) {
        result.push(card);
      }
    }
    return result;
  }

  public override canAct(player: IPlayer): boolean {
    if (player.conglomeratesData.coordination < this.currentCost(player)) {
      return false;
    }
    if (!player.teammates().some((teammate) => this.sharableCards(player, teammate).length > 0)) {
      return false;
    }
    return super.canAct(player);
  }

  actionEssence(player: IPlayer): void {
    const options: Array<SelectOption> = [];
    for (const teammate of player.teammates()) {
      for (const card of this.sharableCards(player, teammate)) {
        options.push(
          new SelectOption(card.name, 'Use').andThen(() => {
            ConglomeratesExpansion.spendCoordination(player, this.currentCost(player), {log: true});
            const result = card.action(player);
            teammate.actionsThisGeneration.add(card.name);
            player.game.log('${0} used ${1}\'s ${2} through Facility Sharing', (b) => b.player(player).player(teammate).card(card));
            if (teammate.tableau.has(CardName.FULL_ACCESS_COOPERATION)) {
              teammate.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {player}});
            }
            ConglomeratesExpansion.increaseTeamActionCost(player, 'facilitySharing');
            return result;
          }),
        );
      }
    }
    player.defer(new OrOptions(...options).setTitle('Select a teammate\'s facility to use').reduce());
  }
}

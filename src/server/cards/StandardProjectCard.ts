import {CardType} from '../../common/cards/CardType';
import {IPlayer} from '../IPlayer';
import {TRSource} from '../../common/cards/TRSource';
import {CardMetadata} from '../../common/cards/CardMetadata';
import {CardName} from '../../common/cards/CardName';
import {Card} from './Card';
import {MoonExpansion} from '../moon/MoonExpansion';
import {Units} from '../../common/Units';
import {IStandardProjectCard} from './IStandardProjectCard';
import {sum} from '../../common/utils/utils';
import {Payment} from '../../common/inputs/Payment';
import {StandardProjectCanPayWith} from '../../common/cards/Types';
import {TurmoilHandler} from '../turmoil/TurmoilHandler';

type StaticStandardProjectCardProperties = {
  name: CardName,
  cost: number,
  metadata: CardMetadata,
  reserveUnits?: Partial<Units>,
  tr?: TRSource,
}


export abstract class StandardProjectCard extends Card implements IStandardProjectCard {
  constructor(properties: StaticStandardProjectCardProperties) {
    super({
      type: CardType.STANDARD_PROJECT,
      ...properties,
    });
  }

  public override get type(): CardType.STANDARD_PROJECT {
    return CardType.STANDARD_PROJECT;
  }

  protected discount(_player: IPlayer) {
    return 0;
  }

  public getAdjustedCost(player: IPlayer) {
    const discountFromCards =
      sum(player.tableau.asArray()
        .map((card) => card.getStandardProjectDiscount?.(player, this) ?? 0));
    const discount = discountFromCards + this.discount(player);
    let adjusted = Math.max(0, this.cost - discount);

    // Tax effects from a played card (e.g. Blockhouse), unlike getStandardProjectDiscount
    // which only ever benefits the acting player's own use. Applies to every player's
    // tableau, including the acting player's own.
    for (const owner of player.game.players) {
      for (const playedCard of owner.tableau) {
        adjusted += playedCard.getStandardProjectCostIncrease?.(owner, player, this) ?? 0;
      }
    }

    return Math.max(0, adjusted);
  }

  protected abstract actionEssence(player: IPlayer): void

  public onStandardProject(player: IPlayer): void {
    for (const playedCard of player.tableau) {
      playedCard.onStandardProject?.(player, this);
    }
    TurmoilHandler.applyOnStandardProjectEffect(player);
  }

  protected canPlayOptions(player: IPlayer) {
    const canPayWith = this.canPayWith(player);
    return {
      ...canPayWith,
      cost: this.getAdjustedCost(player),
      tr: this.tr,
      auroraiData: true,
      spireScience: true,
      reserveUnits: MoonExpansion.adjustedReserveCosts(player, this),
    };
  }

  public canAct(player: IPlayer): boolean {
    return player.canAfford(this.canPlayOptions(player));
  }

  public canPayWith(_player: IPlayer): StandardProjectCanPayWith {
    return {};
  }

  public payAndExecute(player: IPlayer, payment: Payment): void {
    player.pay(payment);
    this.projectPlayed(player);
    this.actionEssence(player);
  }

  protected projectPlayed(player: IPlayer) {
    player.game.log('${0} used ${1} standard project', (b) => b.player(player).card(this));
    // standardProjectsThisGeneration does not include Sell Patents.
    if (this.name !== CardName.SELL_PATENTS_STANDARD_PROJECT) {
      player.standardProjectsThisGeneration.add(this.name);
    }
    this.onStandardProject(player);
  }
}

import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {PartyName} from '../../../common/turmoil/PartyName';

/**
 * Building Deregulation (Solaris, fan): "Industry tile" refers to the Industries (fan
 * expansion) tile family, each placed via its own standard project card
 * (src/server/cards/industries/*IndustryStandardProject.ts). There's no shared TileType or
 * marker to test against generically, so this checks the standard project's CardName
 * directly -- mirroring HighTempSuperconductors' `getStandardProjectDiscount` override for
 * the Power Plant standard project. Registered with `compatibility: 'industries'` in the
 * manifest since it does nothing without that expansion enabled.
 */
const INDUSTRY_STANDARD_PROJECTS: ReadonlySet<CardName> = new Set([
  CardName.ENERGY_INDUSTRY_STANDARD_PROJECT,
  CardName.HEAT_INDUSTRY_STANDARD_PROJECT,
  CardName.MONEY_INDUSTRY_STANDARD_PROJECT,
  CardName.PLANT_INDUSTRY_STANDARD_PROJECT,
  CardName.STEEL_INDUSTRY_STANDARD_PROJECT,
  CardName.TITANIUM_INDUSTRY_STANDARD_PROJECT,
  CardName.WILD_INDUSTRY_STANDARD_PROJECT,
]);

export class BuildingDeregulation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BUILDING_DEREGULATION,
      tags: [Tag.MARS],
      cost: 5,

      requirements: {party: PartyName.EMPOWER},

      metadata: {
        cardNumber: 'SOL15',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play an Industry tile, you pay 2 M€ less for it.', (eb) => {
            eb.empty().startEffect.megacredits(-2);
          });
        }),
        description: 'Requires that Empower are ruling or that you have 2 delegates there.',
      },
    });
  }

  public getStandardProjectDiscount(_player: IPlayer, card: IStandardProjectCard): number {
    return INDUSTRY_STANDARD_PROJECTS.has(card.name) ? 2 : 0;
  }
}

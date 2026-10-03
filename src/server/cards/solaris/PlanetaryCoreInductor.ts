import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';

export class PlanetaryCoreInductor extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PLANETARY_CORE_INDUCTOR,
      // The Power-tag icon on this card was hard to read on the source scan; Power is the
      // best-guess reading given the card's theme (also matches Orbital Hydrogeologic Cannon).
      tags: [Tag.POWER, Tag.SPACE, Tag.GALACTIC],
      cost: 41,

      requirements: {tag: Tag.SCIENCE, count: 5},
      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      action: {
        global: {temperature: 1},
      },

      metadata: {
        cardNumber: 'SL06',
        renderData: CardRenderer.builder((b) => {
          b.action('Increase temperature 1 step.', (eb) => {
            eb.empty().startAction.temperature(1);
          }).br;
          b.vpText('3 VP for each Galactic tag you have, including this.');
        }),
        description: 'Requires 5 Science tags.',
      },
    });
  }

  public override bespokeCanAct(player: IPlayer): boolean {
    return player.canAfford({cost: 0, tr: {temperature: 1}});
  }
}

import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';

export class OrbitalHydrogeologicCannon extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ORBITAL_HYDROGEOLOGIC_CANNON,
      tags: [Tag.POWER, Tag.SPACE, Tag.GALACTIC],
      cost: 53,

      // Playing this card also costs 3 steps of energy production, in addition to its M€ cost.
      behavior: {
        production: {energy: -3},
      },

      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      action: {
        ocean: {},
      },

      metadata: {
        cardNumber: 'SL03',
        renderData: CardRenderer.builder((b) => {
          b.action('Place an ocean tile.', (eb) => {
            eb.empty().startAction.oceans(1);
          }).br;
          b.production((pb) => pb.minus().energy(3)).br;
          b.vpText('3 VP for each Galactic tag you have, including this.');
        }),
        description: 'Decrease your energy production 3 steps.',
      },
    });
  }

  public override bespokeCanAct(player: IPlayer): boolean {
    return player.canAfford({cost: 0, tr: {oceans: 1}});
  }
}

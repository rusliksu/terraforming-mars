import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SerializedCard} from '../../SerializedCard';
import {digit} from '../Options';

export class PercussiveReactor extends Card implements IProjectCard, IActionCard {
  // True once the reactor has been blown up. A disabled reactor keeps its tags
  // but its action can no longer be used.
  public isDisabled = false;

  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PERCUSSIVE_REACTOR,
      tags: [Tag.BUILDING, Tag.POWER],
      cost: 10,

      metadata: {
        cardNumber: 'X10',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 2 energy to gain 7 heat.', (eb) => {
            eb.energy(2).startAction.heat(7, {digit});
          }).br;
          b.action('Blow up the reactor: raise temperature 1 step. This card then becomes unusable.', (eb) => {
            eb.empty().startAction.temperature(1).asterix();
          });
        }),
      },
    });
  }

  public canAct(): boolean {
    return this.isDisabled === false;
  }

  public action(player: IPlayer) {
    const options = new OrOptions();

    if (player.availableEnergy() >= 2) {
      options.options.push(new SelectOption('Spend 2 energy to gain 7 heat', 'Whack it').andThen(() => {
        return player.spendEnergy(2, () => {
          player.stock.add(Resource.HEAT, 7, {log: true});
          return undefined;
        });
      }));
    }

    options.options.push(new SelectOption('Blow up the reactor: raise temperature 1 step (this card becomes unusable)', 'Blow it up').andThen(() => {
      player.game.increaseTemperature(player, 1);
      this.isDisabled = true;
      player.game.log('${0} blew up ${1}', (b) => b.player(player).card(this));
      return undefined;
    }));

    if (options.options.length === 1) {
      return options.options[0].cb();
    }
    return options;
  }

  public serialize(serialized: SerializedCard) {
    serialized.isDisabled = this.isDisabled;
  }

  public deserialize(serialized: SerializedCard) {
    this.isDisabled = Boolean(serialized.isDisabled);
  }
}

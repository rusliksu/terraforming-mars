import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {ALL_RESOURCES} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SimpleDeferredAction} from '../../deferredActions/DeferredAction';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class Robinitta extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ROBINITTA,
      cost: 25,
      victoryPoints: 2,

      metadata: {
        cardNumber: 'X43',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play a card with no tags, including this, increase one of your lowest productions 1 step.', (eb) => {
            eb.cards(1).startEffect.production((pb) => pb.wild(1).asterix());
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.length !== 0) {
      return;
    }
    player.game.defer(new SimpleDeferredAction(player, () => {
      let minimum = Infinity;
      let lowest: Array<SelectOption> = [];
      for (const resource of ALL_RESOURCES) {
        const option = new SelectOption('Increase ' + resource + ' production 1 step').andThen(() => {
          player.production.add(resource, 1, {log: true});
          return undefined;
        });
        if (player.production[resource] < minimum) {
          lowest = [];
          minimum = player.production[resource];
        }
        if (player.production[resource] === minimum) {
          lowest.push(option);
        }
      }
      const result = new OrOptions();
      result.options = lowest;
      return result;
    }));
  }
}

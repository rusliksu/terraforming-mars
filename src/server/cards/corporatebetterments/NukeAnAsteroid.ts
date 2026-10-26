import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectAmount} from '../../inputs/SelectAmount';
import {AndOptions} from '../../inputs/AndOptions';
import {message} from '../../logs/MessageBuilder';
import {all, digit} from '../Options';

export class NukeAnAsteroid extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.NUKE_AN_ASTEROID,
      tags: [Tag.SPACE],
      cost: 16,

      behavior: {
        production: {titanium: 2},
      },

      metadata: {
        cardNumber: 'B36',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(2)).br;
          b.titanium(5, {digit, all}).nbsp.plainText('distributed among any number of other players', true);
        }),
        description: 'Increase your titanium production 2 steps.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const opponents = player.opponents;
    if (opponents.length === 0) {
      return undefined;
    }
    if (opponents.length === 1) {
      opponents[0].stock.add(Resource.TITANIUM, 5, {log: true, from: {player}});
      return undefined;
    }

    const amounts = new Map<string, number>();
    const options = opponents.map((opponent) =>
      new SelectAmount(message('Titanium for ${0}', (b) => b.player(opponent)), 'Confirm', 0, 5)
        .andThen((amount) => {
          amounts.set(opponent.id, amount);
          return undefined;
        }));

    return new AndOptions(...options).andThen(() => {
      let sum = 0;
      for (const amount of amounts.values()) {
        sum += amount;
      }
      if (sum !== 5) {
        throw new Error(`Expecting 5 titanium distributed, got ${sum}.`);
      }
      for (const opponent of opponents) {
        const amount = amounts.get(opponent.id) ?? 0;
        if (amount > 0) {
          opponent.stock.add(Resource.TITANIUM, amount, {log: true, from: {player}});
        }
      }
      return undefined;
    });
  }
}

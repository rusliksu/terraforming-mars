import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class EnergeticInfrastructures extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ENERGETIC_INFRASTRUCTURES,
      tags: [Tag.POWER, Tag.BUILDING],
      cost: 12,

      metadata: {
        cardNumber: 'CB47',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(5).slash().tag(Tag.POWER).br;
          b.megacredits(2, {all}).slash().tag(Tag.POWER, {all});
        }),
        description: 'Get 5 M€ for each Power tag you have, including this. Each opponent gets 2 M€ for each Power tag they have.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    // "Including this" needs a manual +1: this card isn't in the player's tableau yet
    // at the time its own play() resolves.
    const powerTags = player.tags.count(Tag.POWER) + 1;
    player.stock.add(Resource.MEGACREDITS, powerTags * 5, {log: true});

    for (const opponent of player.opponents) {
      const opponentTags = opponent.tags.count(Tag.POWER);
      if (opponentTags > 0) {
        opponent.stock.add(Resource.MEGACREDITS, opponentTags * 2, {log: true});
      }
    }
    return undefined;
  }
}

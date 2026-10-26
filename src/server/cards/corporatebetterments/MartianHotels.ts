import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class MartianHotels extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MARTIAN_HOTELS,
      tags: [Tag.BUILDING],
      cost: 8,

      metadata: {
        cardNumber: 'B18',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(5).slash().tag(Tag.BUILDING, 2).br;
          b.megacredits(1, {all}).slash().tag(Tag.BUILDING, {all});
        }),
        description: 'Get 5 M€ for each 2 Building tags you have, including this. ' +
          'Each opponent gets 1 M€ for each Building tag they have.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    // "Including this" needs a manual +1: this card isn't in the player's tableau yet
    // at the time its own play() resolves.
    const buildingTags = player.tags.count(Tag.BUILDING) + 1;
    const pairs = Math.floor(buildingTags / 2);
    if (pairs > 0) {
      player.stock.add(Resource.MEGACREDITS, pairs * 5, {log: true});
    }

    for (const opponent of player.opponents) {
      const opponentTags = opponent.tags.count(Tag.BUILDING);
      if (opponentTags > 0) {
        opponent.stock.add(Resource.MEGACREDITS, opponentTags, {log: true});
      }
    }
    return undefined;
  }
}

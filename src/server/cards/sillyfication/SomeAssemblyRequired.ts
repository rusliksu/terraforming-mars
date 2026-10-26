import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {PlaceCityTile} from '../../deferredActions/PlaceCityTile';
import {DiscardCards} from '../../deferredActions/DiscardCards';
import {all} from '../Options';

export class SomeAssemblyRequired extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SOME_ASSEMBLY_REQUIRED,
      tags: [Tag.BUILDING, Tag.CITY],
      cost: 20,

      metadata: {
        cardNumber: 'X09',
        renderData: CardRenderer.builder((b) => {
          b.city().br;
          b.minus().cards(1, {all});
        }),
        description: 'Place a city tile. Then every player, including you, discards a card.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.defer(new PlaceCityTile(player));
    for (const p of game.players) {
      game.defer(new DiscardCards(p, 1, 1, 'Some Assembly Required: discard a card'));
    }
    return undefined;
  }
}

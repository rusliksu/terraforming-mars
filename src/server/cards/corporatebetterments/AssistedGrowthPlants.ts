import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {PlaceGreeneryTile} from '../../deferredActions/PlaceGreeneryTile';
import * as constants from '../../../common/constants';

export class AssistedGrowthPlants extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.ASSISTED_GROWTH_PLANTS,
      tags: [Tag.PLANT, Tag.SCIENCE],
      cost: 35,

      metadata: {
        cardNumber: 'B45',
        renderData: CardRenderer.builder((b) => {
          b.greenery().greenery().greenery();
        }),
        description: 'Requires oxygen at maximum. Place 3 greenery tiles.',
      },
    });
  }

  // Bespoke, not a declarative `requirements: {oxygen: 14}` - that flavor of requirement is a
  // numeric threshold, satisfiable via Inventrix/Special Design's global-parameter-requirement
  // bonus even when oxygen isn't actually maxed yet. This card means oxygen genuinely at its
  // hard cap, so it checks the real level directly instead (same approach as Alien Reactor
  // Ativation's temperature/oxygen-maxed checks).
  public override bespokeCanPlay(player: IPlayer): boolean {
    const game = player.game;
    return game.getOxygenLevel() >= constants.MAX_OXYGEN_LEVEL &&
      game.board.getAvailableSpacesForGreenery(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.defer(new PlaceGreeneryTile(player));
    game.defer(new PlaceGreeneryTile(player));
    game.defer(new PlaceGreeneryTile(player));
    return undefined;
  }
}

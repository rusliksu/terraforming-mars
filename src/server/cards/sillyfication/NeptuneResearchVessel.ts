import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {Priority} from '../../deferredActions/Priority';
import {GainResourcesDeferred} from '../../deferredActions/GainResourcesDeferred';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {Board} from '../../boards/Board';

export class NeptuneResearchVessel extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.NEPTUNE_RESEARCH_VESSEL,
      tags: [Tag.JOVIAN, Tag.SCIENCE],
      cost: 9,
      victoryPoints: 1,
      requirements: [{tag: Tag.SCIENCE, count: 2}, {tag: Tag.JOVIAN, count: 2}],

      metadata: {
        cardNumber: 'X16',
        renderData: CardRenderer.builder((b) => {
          b.effect('When any ocean tile is placed, gain 2 M€.', (eb) => {
            eb.oceans(1, {all}).startEffect.megacredits(2);
          });
        }),
        description: 'Requires 2 science tags and 2 Jovian tags.',
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (Board.isUncoveredOceanSpace(space)) {
      cardOwner.game.defer(
        new GainResourcesDeferred(cardOwner, Resource.MEGACREDITS, {count: 2}),
        cardOwner.id !== activePlayer.id ? Priority.OPPONENT_TRIGGER : undefined,
      );
    }
  }
}

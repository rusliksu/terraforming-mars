import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {Space} from '../../boards/Space';
import {TileType} from '../../../common/TileType';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {DeltaProjectExpansion} from '../../delta/DeltaProjectExpansion';

export class DynamicOceanBarrier extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.DYNAMIC_OCEAN_BARRIER,
      cost: 8,

      metadata: {
        cardNumber: 'DP08',
        renderData: CardRenderer.builder((b) => {
          b.effect('Whenever you place an ocean tile, you may move 1 step on the Delta Project track without paying energy. If you pay 1 energy instead, you may ignore 1 required tag.', (eb) => {
            eb.oceans(1).startEffect.plate('Delta track');
          });
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (cardOwner !== activePlayer || space.tile?.tileType !== TileType.OCEAN) {
      return;
    }

    const freeAvailable = DeltaProjectExpansion.canForceAdvanceOneStep(cardOwner, 'primary');
    const paidAvailable = cardOwner.availableEnergy() >= 1 && DeltaProjectExpansion.canForceAdvanceOneStep(cardOwner, 'primary', {ignoreTag: true});
    if (!freeAvailable && !paidAvailable) {
      return;
    }

    const options: Array<SelectOption> = [];
    if (freeAvailable) {
      options.push(new SelectOption('Move 1 step on the Delta Project track for free', 'Advance').andThen(() => {
        DeltaProjectExpansion.forceAdvanceOneStep(cardOwner, 'primary');
        return undefined;
      }));
    }
    if (paidAvailable) {
      options.push(new SelectOption('Pay 1 energy to move 1 step, ignoring 1 required tag', 'Advance').andThen(() => {
        return cardOwner.spendEnergy(1, () => {
          DeltaProjectExpansion.forceAdvanceOneStep(cardOwner, 'primary', {ignoreTag: true});
          return undefined;
        });
      }));
    }
    options.push(new SelectOption('Do nothing', 'Do nothing'));

    cardOwner.defer(() => new OrOptions(...options));
  }
}

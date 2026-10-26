import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {Space} from '../../boards/Space';
import {Board} from '../../boards/Board';
import {GlobalParameter} from '../../../common/GlobalParameter';
import {GainResourcesDeferred} from '../../deferredActions/GainResourcesDeferred';
import {Priority} from '../../deferredActions/Priority';
import {all, digit} from '../Options';

export class WellnessDeluxe extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.WELLNESS_DELUXE,
      tags: [Tag.EARTH],
      startingMegaCredits: 32,

      behavior: {
        stock: {heat: 4},
      },

      firstAction: {
        text: 'Place an ocean tile.',
        ocean: {},
      },

      metadata: {
        cardNumber: 'XC1',
        description: 'You start with 32 M€ and 4 heat. As your first action, place an ocean tile.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.megacredits(32).nbsp.heat(4, {digit}).nbsp.oceans(1);
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.MEDIUM);
            ce.br;
            ce.effect('When you place an ocean tile, increase your heat production 1 step. When any ocean tile is placed, gain 2 heat.', (eb) => {
              eb.oceans(1, {size: Size.SMALL}).colon().production((pb) => pb.heat(1)).nbsp;
              eb.oceans(1, {size: Size.SMALL, all}).startEffect.heat(2, {digit});
            });
            ce.br;
            ce.effect('When you raise the temperature, gain 1 M€.', (eb) => {
              eb.temperature(1).startEffect;
              eb.megacredits(1);
            });
          });
        }),
      },
    });
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (!Board.isUncoveredOceanSpace(space)) {
      return;
    }
    cardOwner.game.defer(
      new GainResourcesDeferred(cardOwner, Resource.HEAT, {count: 2, log: true, from: {card: this}}),
      cardOwner.id !== activePlayer.id ? Priority.OPPONENT_TRIGGER : undefined,
    );
    if (activePlayer.id === cardOwner.id) {
      cardOwner.production.add(Resource.HEAT, 1, {log: true, from: {card: this}});
    }
  }

  public onGlobalParameterIncrease(player: IPlayer, parameter: GlobalParameter, steps: number) {
    if (parameter === GlobalParameter.TEMPERATURE) {
      player.stock.add(Resource.MEGACREDITS, 1 * steps, {log: true});
    }
  }
}

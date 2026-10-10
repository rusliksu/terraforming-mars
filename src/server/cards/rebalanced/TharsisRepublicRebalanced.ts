import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {Space} from '@/server/boards/Space';
import {Resource} from '@/common/Resource';
import {CardName} from '@/common/cards/CardName';
import {Priority} from '@/server/deferredActions/Priority';
import {GainResourcesDeferred} from '@/server/deferredActions/GainResourcesDeferred';
import {GainProduction} from '@/server/deferredActions/GainProduction';
import {Board} from '@/server/boards/Board';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {all} from '@/server/cards/Options';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class TharsisRepublicRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.THARSIS_REPUBLIC_REBALANCED,
      tags: [Tag.BUILDING, Tag.CITY],
      startingMegaCredits: 40,

      firstAction: {
        text: 'Place a city tile',
        city: {},
      },

      metadata: {
        cardNumber: 'R31',
        description: 'You start with 40 M€. As your first action in the game, place a city tile.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(40).nbsp.city();
          b.corpBox('effect', (ce) => {
            ce.effect('When any city tile is placed, increase your M€ production 1 step. When you place a city tile, gain 3 M€.', (eb) => {
              eb.city({size: Size.SMALL, all}).colon();
              eb.production((pb) => pb.megacredits(1)).nbsp;
              eb.city({size: Size.SMALL}).startEffect.megacredits(3);
            });
          });
        }),
      },
    });
  }

  public getCityPlacementMegaCreditProduction(_cardOwner: IPlayer, _activePlayer: IPlayer, _space: Space): number {
    return 1;
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space) {
    if (Board.isCitySpace(space)) {
      if (cardOwner.id === activePlayer.id) {
        cardOwner.game.defer(new GainResourcesDeferred(cardOwner, Resource.MEGACREDITS, {count: 3, log: true, from: {card: this}}));
      }
      cardOwner.game.defer(
        new GainProduction(cardOwner, Resource.MEGACREDITS, {count: this.getCityPlacementMegaCreditProduction(cardOwner, activePlayer, space), log: true, from: {card: this}}),
        cardOwner.id !== activePlayer.id ? Priority.OPPONENT_TRIGGER : undefined,
      );
    }
    return;
  }

  public override bespokePlay(player: IPlayer) {
    if (player.game.isSoloMode()) {
      // Get bonus for 2 neutral cities
      player.production.add(Resource.MEGACREDITS, 2, {log: true});
    }
    return undefined;
  }
}

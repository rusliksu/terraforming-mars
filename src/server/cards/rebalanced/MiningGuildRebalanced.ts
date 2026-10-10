import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {Phase} from '@/common/Phase';
import {Space} from '@/server/boards/Space';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {Resource} from '@/common/Resource';
import {CardName} from '@/common/cards/CardName';
import {GainProduction} from '@/server/deferredActions/GainProduction';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {BoardType} from '@/server/boards/BoardType';
import {digit} from '@/server/cards/Options';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {OrOptions} from '@/server/inputs/OrOptions';
import {SelectOption} from '@/server/inputs/SelectOption';
import {SimpleDeferredAction} from '@/server/deferredActions/DeferredAction';

export class MiningGuildRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.MINING_GUILD_REBALANCED,
      tags: [Tag.BUILDING, Tag.BUILDING],
      startingMegaCredits: 36,

      behavior: {
        production: {steel: 1},
        stock: {steel: 2},
      },

      metadata: {
        cardNumber: 'R24',
        description: 'You start with 36 M€, 2 steel and 1 steel production.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(36).nbsp.steel(2, {digit}).nbsp.production((pb) => pb.steel(1));
          b.corpBox('effect', (ce) => {
            ce.effect('Each time you get any steel as a placement bonus on the map, increase your steel production 1 step. Same for titanium.', (eb) => {
              eb.steel(1).asterix().colon().production((pb) => pb.steel(1));
              eb.or().titanium(1).asterix().startEffect.production((pb) => pb.titanium(1));
            });
          });
        }),
      },
    });
  }

  public onPlacementBonusClaimed(player: IPlayer, space: Space): void {
    this.onTilePlaced(player, player, space, BoardType.MARS);
  }

  public onTilePlaced(cardOwner: IPlayer, activePlayer: IPlayer, space: Space, boardType: BoardType) {
    // Nerfing on The Moon.
    if (boardType !== BoardType.MARS) {
      return;
    }
    if (cardOwner.id !== activePlayer.id || cardOwner.game.phase === Phase.SOLAR) {
      return;
    }
    // Don't grant a bonus for Mars Nomads (no tile actually placed)
    if (cardOwner.game.nomadSpace === space.id && space.tile === undefined) {
      return;
    }
    // Don't grant a bonus if the card is overplaced (like Ares Ocean City)
    if (space.tile?.covers !== undefined) {
      return;
    }
    const steel = space.bonus.includes(SpaceBonus.STEEL);
    const titanium = space.bonus.includes(SpaceBonus.TITANIUM);
    if (steel && titanium) {
      const gain = (resource: Resource) => {
        cardOwner.production.add(resource, 1, {log: true, from: {card: this}});
        return undefined;
      };
      cardOwner.game.defer(new SimpleDeferredAction(cardOwner, () => new OrOptions(
        new SelectOption('Gain 1 steel production', 'Steel').andThen(() => gain(Resource.STEEL)),
        new SelectOption('Gain 1 titanium production', 'Titanium').andThen(() => gain(Resource.TITANIUM)),
      )));
    } else if (steel) {
      cardOwner.game.defer(new GainProduction(cardOwner, Resource.STEEL, {from: {card: this}}));
    } else if (titanium) {
      cardOwner.game.defer(new GainProduction(cardOwner, Resource.TITANIUM, {from: {card: this}}));
    }
  }
}

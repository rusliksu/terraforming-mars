import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {ICard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Phase} from '../../../common/Phase';

export class SpireTech extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SPIRE_TECH,
      tags: [Tag.SPACE, Tag.SCIENCE],
      cost: 25,
      victoryPoints: 1,
      resourceType: CardResource.SCIENCE,

      metadata: {
        cardNumber: 'T21',
        renderData: CardRenderer.builder((b) => {
          b.effect('During each round\'s research phase, gain 1 science resource here for each card you do not buy.', (eb) => {
            eb.cards(1).startEffect.resource(CardResource.SCIENCE, {amount: 1}).asterix();
          }).br;
          b.effect('When you play a card with at least 2 tags, including this, remove 1 science resource here to gain 1 titanium and 1 M€.', (eb) => {
            eb.emptyTag(2).startEffect.minus().resource(CardResource.SCIENCE).nbsp.plus().titanium(1).nbsp.megacredits(1);
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    const count = card.tags.length + (card.type === CardType.EVENT ? 1 : 0);
    if (count >= 2 && this.resourceCount > 0) {
      player.removeResourceFrom(this, 1, {log: true});
      player.stock.add(Resource.TITANIUM, 1, {log: true});
      player.stock.add(Resource.MEGACREDITS, 1, {log: true});
    }
  }

  /** Mirrors Aerotech's hook: called from ChooseCards.keep() for every player who just finished buying cards. */
  public static onDrawCards(player: IPlayer, _cards: ReadonlyArray<IProjectCard>, discards: ReadonlyArray<IProjectCard>) {
    if (player.game.phase === Phase.RESEARCH && discards.length > 0) {
      const card = player.playedCards.get(CardName.SPIRE_TECH);
      if (card !== undefined) {
        player.addResourceTo(card, {qty: discards.length, log: true});
      }
    }
    return undefined;
  }
}

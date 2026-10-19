import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {Resource} from '../../../common/Resource';
import {Turmoil} from '../../turmoil/Turmoil';
import {SelectParty} from '../../inputs/SelectParty';
import {CardRenderer} from '../render/CardRenderer';

export class ImmigrationBureau extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.IMMIGRATION_BUREAU,
      tags: [Tag.EARTH, Tag.BUILDING],
      cost: 9,

      requirements: {party: PartyName.POPULISTS},

      metadata: {
        cardNumber: 'SL40',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you play an Earth event, gain 3 M€ and add 1 delegate to any party.', (eb) => {
            eb.tag(Tag.EARTH).cards(1, {secondaryTag: Tag.EVENT}).startEffect.megacredits(3).delegates(1);
          });
        }),
        description: 'Requires that Populists are ruling or that you have 2 delegates there. Effect: Whenever ' +
          'you play an Earth-tagged Event card, gain 3 M€ and add 1 delegate to any Turmoil party of your choice.',
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.type !== CardType.EVENT || !card.tags.includes(Tag.EARTH)) {
      return undefined;
    }

    player.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {card: this}});

    const turmoil = Turmoil.getTurmoil(player.game);
    const allParties = turmoil.parties.map((party) => party.name);
    if (allParties.length === 0) {
      return undefined;
    }
    return new SelectParty('Select party to send a delegate (Immigration Bureau)', 'Send delegate', allParties)
      .andThen((partyName) => {
        turmoil.sendDelegateToParty(player, partyName, player.game);
        player.totalDelegatesPlaced += 1;
        player.game.log('${0} sent a delegate to ${1}', (b) => b.player(player).partyName(partyName));
        return undefined;
      });
  }
}

import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../ICard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {AddResourcesToCard} from '../../deferredActions/AddResourcesToCard';

/** A Neptune-moon biosystems outfit: engineers Jovian organisms that are classified as microbes. */
export class NereidBiosystems extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.NEREID_BIOSYSTEMS,
      tags: [Tag.JOVIAN, Tag.MICROBE],
      startingMegaCredits: 46,
      resourceType: CardResource.MICROBE,
      initialActionText: 'Draw 1 card with a Jovian tag and 1 card with a Microbe tag',

      metadata: {
        cardNumber: 'XC4',
        description: 'You start with 46 M€. As your first action, draw 1 card with a Jovian tag and 1 card with a Microbe tag.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(46).nbsp.cards(1, {secondaryTag: Tag.JOVIAN}).nbsp.cards(1, {secondaryTag: Tag.MICROBE}).br;
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.MEDIUM);
            ce.br;
            ce.effect('Your Jovian tags also count as microbe tags.', (eb) => {
              eb.tag(Tag.JOVIAN).startEffect.tag(Tag.MICROBE);
            });
            ce.br;
            ce.effect('When you play a card with a microbe tag, including this, add 1 microbe to any card.', (eb) => {
              eb.tag(Tag.MICROBE).startEffect.resource(CardResource.MICROBE).asterix();
            });
            ce.br;
            ce.effect('When paying for a card with a Jovian tag, microbes here may be used as 2 M€ each.', (eb) => {
              eb.tag(Tag.JOVIAN).startEffect.resource(CardResource.MICROBE).equals().megacredits(2);
            });
          }).br;
        }),
      },
    });
  }

  public override initialAction(player: IPlayer) {
    player.drawCard(1, {include: (card) => card.tags.includes(Tag.JOVIAN)});
    player.drawCard(1, {include: (card) => card.tags.includes(Tag.MICROBE)});
    return undefined;
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    // cardTagCount already counts a Jovian tag here as a microbe tag too (see Tags.ts'
    // Nereid Biosystems hook), so this fires for either - a card with both (like this
    // corp itself) counts twice, same as any other two-relevant-tags card would.
    const microbeTags = player.tags.cardTagCount(card, Tag.MICROBE);
    if (microbeTags > 0) {
      player.game.defer(new AddResourcesToCard(player, CardResource.MICROBE, {count: microbeTags}));
    }
  }
}

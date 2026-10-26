import {CardType} from '../../../common/cards/CardType';
import {IProjectCard} from '../IProjectCard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {ALL_TAGS, Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {inplaceRemove} from '../../../common/utils/utils';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';

/**
 * The original card refers to a "Galactic" tag, which does not exist in this engine.
 * The closest real equivalent is the Wild tag - a card that could match any chosen tag would
 * trivially satisfy this search, which is exactly why the original text excludes it.
 */
export class TargetedResearch extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.TARGETED_RESEARCH,
      tags: [Tag.SCIENCE],
      cost: 6,

      metadata: {
        cardNumber: 'I03',
        renderData: CardRenderer.builder((b) => {
          b.cards(1).asterix();
        }),
        description: 'Choose a tag (not the wild tag). Reveal cards from the deck until you reveal a card ' +
          'with the chosen tag. Take that card into your hand; the rest are discarded.',
      },
    });
  }

  private chooseTagAndDraw(player: IPlayer) {
    const tags = [...ALL_TAGS];
    inplaceRemove(tags, Tag.WILD);

    const options = tags.map((tag) => {
      return new SelectOption(tag).andThen(() => {
        player.drawCard(1, {tag: tag});
        return undefined;
      });
    });
    return new OrOptions(...options).setTitle('Select a tag to search for');
  }

  public override bespokePlay(player: IPlayer) {
    player.defer(this.chooseTagAndDraw(player));
    return undefined;
  }
}

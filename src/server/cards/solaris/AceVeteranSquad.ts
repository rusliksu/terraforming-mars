import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {CardRenderer} from '../render/CardRenderer';

// If the player has this many (or more) Space tags at the time the action is used, the
// action yields 2 fighters instead of 1. This is a threshold check, not a linear per-tag
// scaling, so it's implemented as a bespoke `action()` rather than the declarative
// `addResources: Countable` DSL (which only supports linear tag-scaling via `per`/`each`).
const SPACE_TAG_THRESHOLD = 5;

export class AceVeteranSquad extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.ACE_VETERAN_SQUAD,
      tags: [Tag.SPACE],
      cost: 21,

      resourceType: CardResource.FIGHTER,
      victoryPoints: {resourcesHere: {}, per: 2},

      metadata: {
        cardNumber: 'So42',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 fighter resource to this card. If you have 5 or more Space tags, add 2 instead.', (ab) => {
            ab.empty().startAction.resource(CardResource.FIGHTER).asterix();
          }).br;
          b.vpText('1 VP for every 2 fighters on this card.');
        }),
      },
    });
  }

  public canAct(_player: IPlayer): boolean {
    return true;
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const qty = player.tags.count(Tag.SPACE) >= SPACE_TAG_THRESHOLD ? 2 : 1;
    player.addResourceTo(this, {qty, log: true});
    return undefined;
  }
}

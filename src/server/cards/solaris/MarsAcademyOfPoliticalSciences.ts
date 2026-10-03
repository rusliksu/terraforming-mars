import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

const INFLUENCE_BONUS = 2;

export class MarsAcademyOfPoliticalSciences extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARS_ACADEMY_OF_POLITICAL_SCIENCES,
      tags: [Tag.BUILDING],
      cost: 13,

      requirements: {party: PartyName.CENTRISTS},

      behavior: {
        tr: 1,
      },

      metadata: {
        cardNumber: 'SL39',
        renderData: CardRenderer.builder((b) => {
          b.effect(`You have +${INFLUENCE_BONUS} influence.`, (eb) => eb.startEffect.influence().influence());
          b.tr(1);
        }),
        description: 'Requires that Centrists are ruling or that you have 2 delegates there. Raise your TR 1 ' +
          `step. Effect: You have ${INFLUENCE_BONUS} additional Influence.`,
      },
    });
  }

  // While in play, grants a flat Influence bonus -- Turmoil.getInfluence() sums
  // `card.getInfluenceBonus?.(player)` over every card in the player's tableau, so this only
  // applies while the card stays played, same mechanism used elsewhere for permanent influence
  // bonuses (see e.g. this session's other More Parties Bureaucrats work).
  public getInfluenceBonus(_player: IPlayer): number {
    return INFLUENCE_BONUS;
  }
}

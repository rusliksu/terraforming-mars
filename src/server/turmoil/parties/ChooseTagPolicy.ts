import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {IPolicy} from '../Policy';
import {PartyName} from '../../../common/turmoil/PartyName';
import {PolicyId} from '../../../common/turmoil/Types';
import {Tag} from '../../../common/cards/Tag';
import {SelectOption} from '../../inputs/SelectOption';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {TITLES} from '../../inputs/titles';
import {POLITICAL_AGENDAS_MAX_ACTION_USES} from '../../../common/constants';
import {message} from '../../logs/MessageBuilder';

/**
 * More Parties: shared implementation for the "choose a tag, pay a flat fee, gain the first
 * card revealed with that tag" policy that several reworked parties use (Mars First, Centrists,
 * Empower, Greens, Populists, Scientists, Unity) -- the same shape as the existing
 * MarsFirstPolicy04 ("Spend 4 M€ to draw a Building card"), generalized to a chosen tag from a
 * fixed or player-dependent list.
 */
export class ChooseTagPolicy implements IPolicy {
  constructor(
    public readonly id: PolicyId,
    private readonly partyName: PartyName,
    private readonly tagsLabel: string,
    private readonly tags: (player: IPlayer) => ReadonlyArray<Tag>,
    private readonly cost: number = 4,
  ) {}

  get description(): string {
    return `Action: choose ${this.tagsLabel}, spend ${this.cost} M€ to buy the first card with that tag (max 3 times per generation)`;
  }

  canAct(player: IPlayer): boolean {
    return player.canAfford(this.cost) &&
      player.politicalAgendasActionUsedCount < POLITICAL_AGENDAS_MAX_ACTION_USES &&
      this.tags(player).length > 0;
  }

  action(player: IPlayer): PlayerInput | undefined {
    const game = player.game;
    const buy = (tag: Tag) => {
      player.politicalAgendasActionUsedCount += 1;
      game.log('${0} used Turmoil ${1} action', (b) => b.player(player).partyName(this.partyName));
      game.defer(new SelectPaymentDeferred(player, this.cost, {title: TITLES.payForPartyAction(this.partyName)}))
        .andThen(() => player.drawCard(1, {tag}));
      return undefined;
    };

    const tags = this.tags(player);
    if (tags.length === 1) {
      return buy(tags[0]);
    }
    const options = tags.map((tag) => new SelectOption(message('Choose ${0} tag', (b) => b.string(tag))).andThen(() => buy(tag)));
    return new OrOptions(...options);
  }
}

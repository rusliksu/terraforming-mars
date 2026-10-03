import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IProjectCard} from '../IProjectCard';
import {IActionCard} from '../ICard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {SelectPlayer} from '../../inputs/SelectPlayer';

// The steel here is tracked on the card itself (this.resourceCount), separate from real
// player steel: you have to spend one activation adding it before a later activation can
// spend it to block, so blocking a given opponent takes at least two of your generations,
// not one.
export class LittleDutchBoy extends Card implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.LITTLE_DUTCH_BOY,
      cost: 7,

      metadata: {
        cardNumber: 'DP09',
        renderData: CardRenderer.builder((b) => {
          b.action('Add 1 steel to this card.', (ab) => {
            ab.empty().startAction.steel(1);
          }).br;
          b.action('Spend 1 steel from this card to block another player\'s Delta Project marker from advancing for the rest of this generation.', (ab) => {
            ab.steel(1).startAction.plate('Delta track').asterix();
          });
        }),
        description: 'The blockade is removed at the start of the next generation.',
      },
    });
  }

  private blockableOpponents(player: IPlayer): ReadonlyArray<IPlayer> {
    return player.opponents.filter((p) => p.deltaProjectData !== undefined && p.deltaProjectData.blocked !== true);
  }

  public canAct(_player: IPlayer): boolean {
    return true; // Adding 1 steel to the card is always available.
  }

  public action(player: IPlayer): PlayerInput | undefined {
    const targets = this.blockableOpponents(player);

    const addSteel = new SelectOption('Add 1 steel to this card', 'Add steel').andThen(() => {
      this.resourceCount += 1;
      player.game.log('${0} added 1 steel to ${1}', (b) => b.player(player).card(this));
      return undefined;
    });

    if (this.resourceCount < 1 || targets.length === 0) {
      return addSteel.cb(undefined);
    }

    const block = new SelectOption('Spend 1 steel from this card to block an opponent\'s Delta Project marker', 'Block').andThen(() => {
      return new SelectPlayer(targets, 'Select player to block', 'Block').andThen((target) => {
        const targetData = target.deltaProjectData;
        if (targetData === undefined) {
          return undefined;
        }
        this.resourceCount -= 1;
        targetData.blocked = true;
        player.game.log('${0} spent 1 steel from ${1} to block ${2}\'s Delta Project marker for the rest of this generation',
          (b) => b.player(player).card(this).player(target));
        return undefined;
      });
    });

    return new OrOptions(addSteel, block);
  }
}

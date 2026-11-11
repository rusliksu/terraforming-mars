import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {CardRenderer} from '../render/CardRenderer';
import {CeoCard} from './CeoCard';
import {Resource} from '../../../common/Resource';
import {Phase} from '../../../common/Phase';
import {ICeoCard} from './ICeoCard';
import {OncePerAction} from '@/server/utils/OncePerAction';

const MAX_TRIGGER_COUNT = 10;
const MEGA_CREDITS_GAINED = 4;

export class Greta extends CeoCard implements ICeoCard {
  constructor() {
    super({
      name: CardName.GRETA,
      metadata: {
        cardNumber: 'L31',
        renderData: CardRenderer.builder((b) => {
          b.opgArrow().text('ACTIVATE THE BELOW ABILITY');
          b.br.br;
          b.tr(1).colon().megacredits(4).asterix();
          b.br;
        }),
        description: 'When you take an action or play a card that increases your TR THIS GENERATION (max 10 times), gain 4 M€.',
      },
    });
  }

  public data: {
    effectTriggerCount: number,
  } = {
      effectTriggerCount: 0,
    };

  public action(): PlayerInput | undefined {
    this.opgActionIsActive = true;
    this.isDisabled = true;
    return undefined;
  }

  private readonly oncePerAction = new OncePerAction();

  public onIncreaseTerraformRatingByAnyPlayer(cardOwner: IPlayer, player: IPlayer) {
    const game = player.game;
    this.oncePerAction.oncePerAction(game, () => {
      if (this.opgActionIsActive === true && this.data.effectTriggerCount < MAX_TRIGGER_COUNT) {
        if (player === cardOwner && game.activePlayer === player && game.phase === Phase.ACTION) {
          this.data.effectTriggerCount++;
          player.stock.add(Resource.MEGACREDITS, MEGA_CREDITS_GAINED);
          game.log('${0} gained ${1}${2} because of ${3} (${4}/${5})', (b) => b
            .player(player)
            .number(MEGA_CREDITS_GAINED)
            .resource(Resource.MEGACREDITS)
            .card(this)
            .number(this.data.effectTriggerCount)
            .number(MAX_TRIGGER_COUNT),
          {
            effect: {
              kind: 'resource',
              resource: Resource.MEGACREDITS,
              production: false,
              amount: MEGA_CREDITS_GAINED,
              player: player.color,
              counter: {current: this.data.effectTriggerCount, max: MAX_TRIGGER_COUNT},
            },
          });
        }
      }
      return undefined;
    });
    return undefined;
  }
}

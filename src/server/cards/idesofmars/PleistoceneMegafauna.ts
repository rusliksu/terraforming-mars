import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {Resource} from '../../../common/Resource';
import {SelectPlayer} from '../../inputs/SelectPlayer';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class PleistoceneMegafauna extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.PLEISTOCENE_MEGAFAUNA,
      tags: [Tag.ANIMAL],
      cost: 12,

      resourceType: CardResource.ANIMAL,
      victoryPoints: {resourcesHere: {}},
      requirements: {tag: Tag.SCIENCE, count: 5},

      behavior: {
        production: {plants: -1},
      },

      action: {
        addResources: 1,
      },

      metadata: {
        cardNumber: 'Im64',
        renderData: CardRenderer.builder((b) => {
          b.action('Add an animal to this card.', (eb) => {
            eb.empty().startAction.resource(CardResource.ANIMAL);
          }).br;
          b.production((pb) => pb.minus().plants(1, {all})).br;
          b.vpText('1 VP for every animal on this card.');
        }),
        description: 'Requires 5 science tags. Decrease one opponent\'s plant production 1 step and your own plant production 1 step.',
      },
    });
  }

  private targets(player: IPlayer): Array<IPlayer> {
    return player.game.players.filter((p) => p !== player && p.canHaveProductionReduced(Resource.PLANTS, 1, player));
  }

  private attack(player: IPlayer, target: IPlayer) {
    target.maybeBlockAttack(player, 'lose 1 plant production', (proceed) => {
      if (proceed) {
        target.production.add(Resource.PLANTS, -1, {log: true, from: {player}});
      }
      return undefined;
    });
  }

  public override bespokePlay(player: IPlayer): PlayerInput | undefined {
    const targets = this.targets(player);
    if (targets.length === 0) {
      // No opponent can lose plant production (e.g. solo mode).
      return undefined;
    }
    if (targets.length === 1) {
      this.attack(player, targets[0]);
      return undefined;
    }
    return new SelectPlayer(targets, 'Select a player to lose 1 plant production').andThen((target) => {
      this.attack(player, target);
      return undefined;
    });
  }
}

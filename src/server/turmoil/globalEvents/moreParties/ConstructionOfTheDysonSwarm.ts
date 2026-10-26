import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IGame} from '../../../IGame';
import {IPlayer} from '../../../IPlayer';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class ConstructionOfTheDysonSwarm extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.CONSTRUCTION_OF_THE_DYSON_SWARM,
      description: 'Lose 2 M€ for each infrastructure tag. The player with the most infrastructure tags gains 2 TR, ' +
        'the player with the second-most gains 1 TR (ties are friendly).',
      revealedDelegate: PartyName.BUREAUCRATS,
      currentDelegate: PartyName.POPULISTS,
      behavior: {
        lose: {
          stock: {
            megacredits: {
              tag: Tag.INFRASTRUCTURE,
              each: 2,
            },
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.minus().megacredits(2).slash().tag(Tag.INFRASTRUCTURE).br;
        b.text('1st:', {size: Size.SMALL}).tr(2, {size: Size.TINY}).nbsp.text('2nd:', {size: Size.SMALL}).tr(1, {size: Size.TINY});
      }),
    });
  }

  private getScore(player: IPlayer): number {
    return player.tags.count(Tag.INFRASTRUCTURE, 'raw');
  }

  // Ranking logic mirrors Election.ts (src/server/turmoil/globalEvents/Election.ts), simplified
  // since there's just one thing to count (infrastructure tags) and no influence involved.
  public override bespokeResolve(game: IGame) {
    if (game.isSoloMode()) {
      const player = game.players[0];
      if (this.getScore(player) > 0) {
        player.increaseTerraformRating(2, {log: true});
      }
      return;
    }

    const players = game.players.toSorted((p1, p2) => this.getScore(p2) - this.getScore(p1));

    if (this.getScore(players[0]) > this.getScore(players[1])) {
      players[0].increaseTerraformRating(2, {log: true});
      players.shift();

      if (players.length === 1) {
        players[0].increaseTerraformRating(1, {log: true});
      } else if (players.length > 1) {
        if (this.getScore(players[0]) > this.getScore(players[1])) {
          players[0].increaseTerraformRating(1, {log: true});
        } else {
          const score = this.getScore(players[0]);
          while (players.length > 0 && this.getScore(players[0]) === score) {
            players[0].increaseTerraformRating(1, {log: true});
            players.shift();
          }
        }
      }
    } else {
      const score = this.getScore(players[0]);
      while (players.length > 0 && this.getScore(players[0]) === score) {
        players[0].increaseTerraformRating(2, {log: true});
        players.shift();
      }
    }
  }
}

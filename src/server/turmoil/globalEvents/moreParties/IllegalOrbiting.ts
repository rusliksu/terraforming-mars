import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IGame} from '../../../IGame';
import {Tag} from '../../../../common/cards/Tag';
import {Resource} from '../../../../common/Resource';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

/**
 * Illegal Orbiting (More Parties, fan) / "Kessler's Blast": each player loses 1 M€ for every
 * Earth tag they own (max 5), reduced by influence. Separately, the player(s) with the most
 * Space tags (ties are friendly, matching Election.ts's convention) raise titanium production
 * by one step.
 */
export class IllegalOrbiting extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.ILLEGAL_ORBITING,
      description: 'Each player loses 1 M€ for every earth tag (max 5, then reduced by influence). The player(s) with the most space tags increase their titanium production by one.',
      revealedDelegate: PartyName.BUREAUCRATS,
      currentDelegate: PartyName.CENTRISTS,
      behavior: {
        lose: {
          stock: {
            megacredits: {
              tag: Tag.EARTH,
              each: 1,
              turmoil: {max: 5, influence: {subtract: true}},
            },
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.minus().megacredits(1).slash().tag(Tag.EARTH, {size: Size.SMALL}).influence({size: Size.SMALL}).br;
        b.tag(Tag.SPACE, {size: Size.SMALL}).text('max', {size: Size.TINY}).colon().production((pb) => pb.titanium(1));
      }),
    });
  }

  public override bespokeResolve(game: IGame) {
    const players = game.players;
    const scores = players.map((player) => player.tags.count(Tag.SPACE, 'raw'));
    const max = Math.max(...scores);

    players.forEach((player, index) => {
      if (scores[index] === max) {
        player.production.add(Resource.TITANIUM, 1, {log: true, from: {globalEvent: this}});
      }
    });
  }
}

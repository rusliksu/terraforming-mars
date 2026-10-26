import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '@/common/turmoil/PartyName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {IGame} from '@/server/IGame';

export class PopulationCollapses extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.POPULATION_COLLAPSES,
      description: 'Move the markers on all colonies one space to the left. Each player receives 2 M€ for every colony they own.',
      revealedDelegate: PartyName.EMPOWER,
      currentDelegate: PartyName.POPULISTS,
      behavior: {
        stock: {
          megacredits: {
            colonies: {colonies: {}},
            each: 2,
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.text('Colony markers -1', {size: Size.SMALL}).br;
        b.megacredits(2).slash().colonies(1);
      }),
    });
  }

  public override bespokeResolve(game: IGame) {
    for (const colony of game.colonies) {
      colony.decreaseTrack();
    }
  }
}

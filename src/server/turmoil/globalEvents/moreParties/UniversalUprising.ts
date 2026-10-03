import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

// More Parties (Universal Uprising / "Welfare Economy"): the source text describes two unrelated
// effects -- a plant gain scaled by greeneries owned (plus influence), and a flat reward where
// each player independently chooses between 5 M€ or 3 steel. The latter is a genuine per-player
// choice (not a counting-basis "OR" like Old Earth Reserve's), so it uses the declarative `or`
// field alongside the `stock` field in the same `behavior` object -- `Executor.execute` processes
// both without either short-circuiting the other. Greeneries use `all: false` so each player only
// counts their own tiles, matching LuxuryEstate.ts's precedent (the Countable default for
// `greeneries`/`cities` is to count *everyone's* tiles unless `all: false` is set explicitly).
export class UniversalUprising extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.UNIVERSAL_UPRISING,
      description: 'Each player gains 1 plant for every greenery they own, plus influence. ' +
        'Each player chooses to gain 5 M€ or 3 steel.',
      revealedDelegate: PartyName.BUREAUCRATS,
      currentDelegate: PartyName.TRANSHUMANISTS,
      behavior: {
        stock: {
          plants: {greeneries: {}, all: false, turmoil: {influence: {}}},
        },
        or: {
          behaviors: [
            {title: 'Gain 5 M€', stock: {megacredits: 5}},
            {title: 'Gain 3 steel', stock: {steel: 3}},
          ],
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.plants(1).slash().greenery({size: Size.SMALL}).plus().influence({size: Size.SMALL}).br;
        b.megacredits(5).nbsp.or().nbsp.steel(3);
      }),
    });
  }
}

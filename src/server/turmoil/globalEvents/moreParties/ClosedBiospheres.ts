import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {Resource} from '../../../../common/Resource';
import {CardResource} from '../../../../common/CardResource';
import {OrOptions} from '../../../inputs/OrOptions';
import {SelectOption} from '../../../inputs/SelectOption';
import {AddResourcesToCard} from '../../../deferredActions/AddResourcesToCard';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';
import {digit} from '../../../cards/Options';

export class ClosedBiospheres extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.CLOSED_BIOSPHERES,
      description: 'Each player may reduce their plant production 1 step to gain 2 floaters, 3 titanium, or 5 steel, increased by influence.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.POPULISTS,
      renderData: CardRenderer.builder((b) => {
        b.minus(Size.SMALL).production((pb) => pb.plants(1, {size: Size.SMALL})).colon(Size.SMALL).br;
        b.resource(CardResource.FLOATER, {amount: 2, size: Size.SMALL, digit}).or(Size.SMALL)
          .titanium(3, {size: Size.SMALL, digit}).or(Size.SMALL).steel(5, {size: Size.SMALL, digit})
          .plus(Size.SMALL).influence({size: Size.SMALL});
      }),
    });
  }

  // "Can" makes this optional, and it's a 3-way reward choice boosted by influence, so this
  // needs a bespoke OrOptions prompt rather than the declarative `behavior` DSL.
  public override bespokeResolvePlayer(player: IPlayer) {
    if (player.production.plants <= 0) {
      return;
    }
    const game = player.game;
    const turmoil = Turmoil.getTurmoil(game);
    const bonus = turmoil.getInfluence(player);

    const reduce = () => player.production.add(Resource.PLANTS, -1, {log: true});

    const skip = new SelectOption('Do not reduce plant production', 'Skip').andThen(() => undefined);
    const floaters = 2 + bonus;
    const titanium = 3 + bonus;
    const steel = 5 + bonus;

    const floaterOption = new SelectOption(
      `Reduce plant production 1 step to gain ${floaters} floater(s)`, 'Gain floaters').andThen(() => {
      reduce();
      game.defer(new AddResourcesToCard(player, CardResource.FLOATER, {count: floaters}));
      return undefined;
    });
    const titaniumOption = new SelectOption(
      `Reduce plant production 1 step to gain ${titanium} titanium`, 'Gain titanium').andThen(() => {
      reduce();
      player.stock.add(Resource.TITANIUM, titanium, {log: true, from: {globalEvent: this}});
      return undefined;
    });
    const steelOption = new SelectOption(
      `Reduce plant production 1 step to gain ${steel} steel`, 'Gain steel').andThen(() => {
      reduce();
      player.stock.add(Resource.STEEL, steel, {log: true, from: {globalEvent: this}});
      return undefined;
    });

    player.defer(new OrOptions(skip, floaterOption, titaniumOption, steelOption));
  }
}

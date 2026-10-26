import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {Tag} from '../../../../common/cards/Tag';
import {Resource} from '../../../../common/Resource';
import {OrOptions} from '../../../inputs/OrOptions';
import {SelectOption} from '../../../inputs/SelectOption';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

/**
 * "Planet tags": this codebase has no single Tag.PLANET. Two prior-art groupings exist:
 * UnityMoreParties.ts's PLANET_TAGS_EXCEPT_MARS (Venus/Earth/Jovian) and
 * PathfindersData.ts's PLANETARY_TAGS (Venus/Earth/Mars/Jovian/Moon). Per this task's explicit
 * guidance ("Earth/Mars/Venus/Jovian all count as planet"), Mars is included here and Moon is
 * not.
 */
const PLANET_TAGS = [Tag.EARTH, Tag.MARS, Tag.VENUS, Tag.JOVIAN];

/**
 * Extraterrestrial Politics (More Parties, fan) / "Planet Federation": each player with at
 * least 4 planet tags (influence counts as planet tags too) chooses one of 2 titanium, 4 steel,
 * or 5 M€.
 */
export class ExtraterrestrialPolitics extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.EXTRATERRESTRIAL_POLITICS,
      description: 'Each player with at least 4 planet tags (influence counts as a planet tag) receives either 2 titanium, 4 steel or 5 M€.',
      revealedDelegate: PartyName.CENTRISTS,
      currentDelegate: PartyName.EMPOWER,
      renderData: CardRenderer.builder((b) => {
        b.text('4+', {size: Size.SMALL}).tag(Tag.EARTH, {size: Size.SMALL}).tag(Tag.MARS, {size: Size.SMALL})
          .tag(Tag.VENUS, {size: Size.SMALL}).tag(Tag.JOVIAN, {size: Size.SMALL}).influence({size: Size.SMALL}).colon().br;
        b.titanium(2).or().steel(4).or().megacredits(5);
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const planetTags = PLANET_TAGS.reduce((sum, tag) => sum + player.tags.count(tag, 'raw'), 0) + turmoil.getInfluence(player);

    if (planetTags < 4) {
      return;
    }

    player.defer(
      new OrOptions(
        new SelectOption('Gain 2 titanium', 'Gain titanium').andThen(() => {
          player.stock.add(Resource.TITANIUM, 2, {log: true, from: {globalEvent: this}});
          return undefined;
        }),
        new SelectOption('Gain 4 steel', 'Gain steel').andThen(() => {
          player.stock.add(Resource.STEEL, 4, {log: true, from: {globalEvent: this}});
          return undefined;
        }),
        new SelectOption('Gain 5 M€', 'Gain M€').andThen(() => {
          player.stock.add(Resource.MEGACREDITS, 5, {log: true, from: {globalEvent: this}});
          return undefined;
        }),
      ),
    );
  }
}

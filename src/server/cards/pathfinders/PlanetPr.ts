import {Tag} from '../../../common/cards/Tag';
import {CorporationCard} from '../corporation/CorporationCard';
import {ICorporationCard} from '../corporation/ICorporationCard';
import {IPlayer} from '../../IPlayer';
import {PlayerInput} from '../../PlayerInput';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {DeclareCloneTag} from '../../pathfinders/DeclareCloneTag';
import {ICloneTagCard} from './ICloneTagCard';
import {DrawCards} from '../../deferredActions/DrawCards';
import {CardResource} from '../../../common/CardResource';
import {Size} from '../../../common/cards/render/Size';
import {PlanetaryTag} from '../../pathfinders/PathfindersData';

export class PlanetPr extends CorporationCard implements ICorporationCard, ICloneTagCard {
  /** The planetary tag of the last card played that carried one - tracked so
   * PathfindersExpansion.onCardPlayed can tell when two in a row match. */
  public lastPlanetaryTag: PlanetaryTag | undefined = undefined;

  constructor() {
    super({
      name: CardName.PLANET_PR,
      startingMegaCredits: 40,
      initialActionText: 'Choose a planet tag, then draw a card with that tag',

      metadata: {
        cardNumber: 'Pf00', // Renumber
        description: 'You start with 40 M€.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(40).br;
          b.corpBox('effect', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.br;
            ce.effect('Each time you play two cards with the same planetary tag in a row, raise that track 1 additional step on the second one.', (eb) => {
              eb.tag(Tag.CLONE, {size: Size.SMALL}).nbsp.tag(Tag.CLONE, {size: Size.SMALL})
                .startEffect.planetaryTrack().plus(Size.SMALL).text('1', {size: Size.SMALL});
            });
            ce.br;
            ce.effect('Whenever you trigger the Venus track\'s bonus, also gain 1 floater.', (eb) => {
              eb.tag(Tag.VENUS, {size: Size.SMALL}).startEffect.resource(CardResource.FLOATER, {size: Size.SMALL});
            });
            ce.effect('Whenever you trigger the Earth track\'s bonus, also gain 2 M€.', (eb) => {
              eb.tag(Tag.EARTH, {size: Size.SMALL}).startEffect.megacredits(2, {size: Size.SMALL});
            });
            ce.br;
            ce.effect('Whenever you trigger the Mars or Moon track\'s bonus, also gain 1 steel.', (eb) => {
              eb.tag(Tag.MARS, {size: Size.SMALL}).nbsp.tag(Tag.MOON, {size: Size.SMALL}).startEffect.steel(1, {size: Size.SMALL});
            });
            ce.effect('Whenever you trigger the Jovian track\'s bonus, also gain 1 titanium.', (eb) => {
              eb.tag(Tag.JOVIAN, {size: Size.SMALL}).startEffect.titanium(1, {size: Size.SMALL});
            });
          });
        }),
      },
    });
  }

  public cloneTag: Tag = Tag.CLONE;

  public override get tags(): Array<Tag> {
    return [this.cloneTag];
  }

  public override initialAction(player: IPlayer): PlayerInput | undefined {
    player.game.defer(new DeclareCloneTag(player, this))
      .andThen((tag) => {
        player.game.defer(DrawCards.keepAll(player, 1, {tag}));
        return undefined;
      });
    return undefined;
  }
}

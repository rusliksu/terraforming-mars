import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Tag} from '../../../common/cards/Tag';
import {PartyName} from '../../../common/turmoil/PartyName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {uppercase} from '../Options';

/**
 * Judgment call (see task notes): corporations aren't normally discardable in this engine.
 * `player.pickedCorporationCard` itself is only read during the setup/draft phase and by
 * OrbitalHeadquarters (guarded with `?.`), so clearing it wouldn't crash anything -- but it also
 * wouldn't accomplish anything, because a corporation's actual ongoing identity/effects (tags,
 * onCardPlayed hooks, getInfluenceBonus, etc.) all come from it living in `player.playedCards`
 * (the tableau), the same as any other played card. So "discard the corporation card" is
 * implemented here as removing it from the tableau via `playedCards.remove()` -- the same
 * primitive `Player.discardPlayedCard` uses -- which is what actually ends its effects. We
 * deliberately do NOT route through `Player.discardPlayedCard` itself: that method also pushes
 * the card into `game.projectDeck`, which is the wrong deck for a corporation card (it isn't an
 * `IProjectCard`, and this engine has no "corporation discard pile"). We also deliberately leave
 * `pickedCorporationCard` untouched, since nothing besides setup and the optional-chained
 * OrbitalHeadquarters lookup reads it, and blanking it risks a class of bugs we can't fully rule
 * out from static inspection alone (any future code that assumes it's always defined post-setup).
 */
export class CompanyNationalization extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COMPANY_NATIONALIZATION,
      tags: [Tag.EARTH],
      cost: 4,

      requirements: {party: PartyName.REDS},

      metadata: {
        cardNumber: 'SL32',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2)).nbsp.megacredits(15).br;
          b.or().br;
          b.steel(12).nbsp.energy(4).br;
          b.or().br;
          b.production((pb) => pb.titanium(2)).nbsp.titanium(3).br;
          b.text('then discard your corporation card', {size: Size.SMALL, uppercase});
        }),
        description: 'Requires that Reds are ruling or that you have 2 delegates there. Choose one: ' +
          'Increase your M€ production 2 steps and gain 15 M€; OR gain 12 steel and 4 energy; OR increase your ' +
          'titanium production 2 steps and gain 3 titanium.',
      },
    });
  }

  private discardCorporationCard(player: IPlayer) {
    const corporationCard = player.pickedCorporationCard;
    if (corporationCard !== undefined && player.playedCards.remove(corporationCard)) {
      player.game.log('${0} discarded ${1}', (b) => b.player(player).card(corporationCard));
    }
    return undefined;
  }

  public override bespokePlay(player: IPlayer) {
    const increaseMegacredits = new SelectOption(
      'Increase your M€ production 2 steps and gain 15 M€', 'Nationalize')
      .andThen(() => {
        player.production.add(Resource.MEGACREDITS, 2, {log: true});
        player.stock.add(Resource.MEGACREDITS, 15, {log: true});
        return this.discardCorporationCard(player);
      });

    const gainSteelAndEnergy = new SelectOption(
      'Gain 12 steel and 4 energy', 'Nationalize')
      .andThen(() => {
        player.stock.add(Resource.STEEL, 12, {log: true});
        player.stock.add(Resource.ENERGY, 4, {log: true});
        return this.discardCorporationCard(player);
      });

    const increaseTitanium = new SelectOption(
      'Increase your titanium production 2 steps and gain 3 titanium', 'Nationalize')
      .andThen(() => {
        player.production.add(Resource.TITANIUM, 2, {log: true});
        player.stock.add(Resource.TITANIUM, 3, {log: true});
        return this.discardCorporationCard(player);
      });

    return new OrOptions(increaseMegacredits, gainSteelAndEnergy, increaseTitanium);
  }
}

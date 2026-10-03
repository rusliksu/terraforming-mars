import {Card, StaticCardProperties} from '../Card';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CanAffordOptions} from '../../IPlayer';
import {RelativeTagRequirement} from '../requirements/RelativeTagRequirement';

const SILVER_CARD_REQUIREMENT = new RelativeTagRequirement(Tag.SPACE, Tag.INFRASTRUCTURE);

/**
 * High Orbit (fan): shared base for "Silver" cards -- Infrastructure-tagged cards that live in
 * a shared, always-visible supply (IGame.infrastructureSupply) rather than the project deck.
 * Any player may acquire an available design as a normal action (see
 * Player.getHighOrbitInfrastructureOptions), so several different players can each
 * independently own their own copy of the same CardName.
 *
 * Every Silver card carries the Infrastructure tag and requires the player to have more Space
 * tags than Infrastructure tags to play (the same on every Silver card in the source material).
 * They also all need a guard against a player playing a second copy of a card they already have
 * in their tableau -- vanilla Terraforming Mars never needed this because a card's CardName was
 * always unique in the deck, so double ownership was structurally impossible before Silver cards.
 *
 * Planetary Outpost is the one documented exception -- no Infrastructure tag, paid via standard
 * M€ rules -- and does not extend this class (see PlanetaryOutpost.ts).
 *
 * Subclasses with their own `bespokeCanPlay` logic should combine it with
 * `super.bespokeCanPlay(player, canAffordOptions)` rather than overriding outright.
 */
export abstract class SilverCard extends Card {
  constructor(properties: StaticCardProperties) {
    super({
      ...properties,
      tags: [...(properties.tags ?? []), Tag.INFRASTRUCTURE],
    });
  }

  public override bespokeCanPlay(player: IPlayer, _canAffordOptions: CanAffordOptions): boolean {
    if (player.tableau.has(this.name)) {
      return false;
    }
    return SILVER_CARD_REQUIREMENT.satisfies(player);
  }
}

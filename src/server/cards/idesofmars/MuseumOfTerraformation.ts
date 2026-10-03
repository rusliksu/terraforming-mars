import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {Tag} from '../../../common/cards/Tag';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

/**
 * Counts maxed global parameters: temperature, oxygen, oceans, and (when the Venus expansion
 * is in play) the Venus scale. Modeled on the "if the parameter is maxed" checks seen in
 * VenusRequirement/OceanRequirement/etc, using game.parameters.<x>.max as the ceiling.
 */
export class MuseumOfTerraformation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.MUSEUM_OF_TERRAFORMATION,
      tags: [Tag.BUILDING],
      cost: 8,

      metadata: {
        cardNumber: 'I06',
        renderData: CardRenderer.builder((b) => {
          b.tr(1, {digit}).asterix();
        }),
        description: 'Raise your TR 1 step for every maxed global parameter (temperature, oxygen, oceans, and Venus if in play).',
      },
    });
  }

  private maxedParameterCount(player: IPlayer): number {
    const game = player.game;
    let count = 0;
    if (game.getTemperature() >= game.parameters.temperature.max) {
      count++;
    }
    if (game.getOxygenLevel() >= game.parameters.oxygen.max) {
      count++;
    }
    if (game.board.getOceanSpaces().length >= game.parameters.oceans.max) {
      count++;
    }
    if (game.gameOptions.venusNextExtension && game.getVenusScaleLevel() >= game.parameters.venus.max) {
      count++;
    }
    return count;
  }

  public override bespokePlay(player: IPlayer) {
    const count = this.maxedParameterCount(player);
    if (count > 0) {
      player.increaseTerraformRating(count, {log: true});
    }
    return undefined;
  }
}

import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {IGame} from '../../IGame';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';
import {LogHelper} from '../../LogHelper';
import * as constants from '../../../common/constants';

export class AlienReactorAtivation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.ALIEN_REACTOR_ATIVATION,
      // The extraction spec's own notes flag the printed "EVENT" tag icon as likely just the
      // card-type indicator, not a formal tag - base-game Event cards don't declare Tag.EVENT
      // in their `tags` array either (it's derived automatically from CardType.EVENT).
      tags: [],
      cost: 16,

      metadata: {
        cardNumber: 'H11',
        description: 'Increase the temperature OR the oxygen level 1 step. Increase your TR 1 step ' +
          '(in addition to any TR gained from raising the global parameter).',
        renderData: CardRenderer.builder((b) => {
          b.temperature(1).or(Size.SMALL).oxygen(1).br;
          b.tr(1).asterix();
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const game = player.game;
    return !this.temperatureIsMaxed(game) || !this.oxygenIsMaxed(game);
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    const temperatureMaxed = this.temperatureIsMaxed(game);
    const oxygenMaxed = this.oxygenIsMaxed(game);

    if (temperatureMaxed && oxygenMaxed) {
      return undefined;
    }

    if (!temperatureMaxed && oxygenMaxed) {
      this.raiseTemperature(player);
      return undefined;
    }
    if (temperatureMaxed && !oxygenMaxed) {
      this.raiseOxygen(player);
      return undefined;
    }

    const increaseTemperature = new SelectOption('Raise temperature 1 step', 'Raise temperature').andThen(() => {
      this.raiseTemperature(player);
      return undefined;
    });
    const increaseOxygen = new SelectOption('Raise oxygen 1 step', 'Raise oxygen').andThen(() => {
      this.raiseOxygen(player);
      return undefined;
    });

    return new OrOptions(increaseTemperature, increaseOxygen)
      .setTitle('Choose global parameter to raise');
  }

  private raiseTemperature(player: IPlayer) {
    player.game.increaseTemperature(player, 1);
    LogHelper.logTemperatureIncrease(player, 1);
    player.increaseTerraformRating(1, {log: true});
  }

  private raiseOxygen(player: IPlayer) {
    player.game.increaseOxygenLevel(player, 1);
    player.increaseTerraformRating(1, {log: true});
  }

  private temperatureIsMaxed(game: IGame) {
    return game.getTemperature() === constants.MAX_TEMPERATURE;
  }

  private oxygenIsMaxed(game: IGame) {
    return game.getOxygenLevel() === constants.MAX_OXYGEN_LEVEL;
  }
}

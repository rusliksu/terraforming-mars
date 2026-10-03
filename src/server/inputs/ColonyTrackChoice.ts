import {ColonyTrackChoiceModel} from '@/common/models/ColonyTradeContextModel';
import {OrOptionsModel} from '@/common/models/PlayerInputModel';
import {IPlayer} from '@/server/IPlayer';
import {PlayerInput} from '@/server/PlayerInput';
import {OrOptions} from './OrOptions';

/** A HIGH/LOW prompt with the baseline for its entire multi-tile action. */
export class ColonyTrackChoice extends OrOptions {
  constructor(private readonly choices: ColonyTrackChoiceModel, ...options: Array<PlayerInput>) {
    super(...options);
  }

  public override toModel(player: IPlayer): OrOptionsModel {
    const model = super.toModel(player);
    model.colonyTrackChoices = {
      version: 1,
      colonies: this.choices.colonies.map((colony) => ({...colony})),
    };
    return model;
  }
}

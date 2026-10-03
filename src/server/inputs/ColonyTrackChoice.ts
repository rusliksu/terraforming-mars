import {ColonyTrackChoiceModel} from '@/common/models/ColonyTradeContextModel';
import {ColonyName} from '@/common/colonies/ColonyName';
import {OrOptionsModel} from '@/common/models/PlayerInputModel';
import {IPlayer} from '@/server/IPlayer';
import {PlayerInput} from '@/server/PlayerInput';
import {OrOptions} from './OrOptions';

/** A HIGH/LOW prompt with the baseline for its entire multi-tile action. */
export class ColonyTrackChoice extends OrOptions {
  constructor(
    private readonly currentColony: ColonyName,
    private readonly choices: ColonyTrackChoiceModel['colonies'],
    ...options: Array<PlayerInput>
  ) {
    super(...options);
  }

  public override toModel(player: IPlayer): OrOptionsModel {
    const model = super.toModel(player);
    model.colonyTrackChoices = {
      version: 1,
      currentColony: this.currentColony,
      colonies: this.choices.map((colony) => ({...colony})),
    };
    return model;
  }
}

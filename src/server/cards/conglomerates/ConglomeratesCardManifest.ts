import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {Selfish} from './Selfish';
import {FullAccessCooperation} from './FullAccessCooperation';
import {HelpRequest} from './HelpRequest';
import {GivePatent} from './teamActions/GivePatent';
import {FacilitySharing} from './teamActions/FacilitySharing';
import {DonationAction} from './teamActions/DonationAction';

export const CONGLOMERATES_CARD_MANIFEST = new ModuleManifest({
  module: 'conglomerates',
  projectCards: {
    [CardName.SELFISH]: {Factory: Selfish},
    [CardName.FULL_ACCESS_COOPERATION]: {Factory: FullAccessCooperation},
    [CardName.HELP_REQUEST]: {Factory: HelpRequest},
  },
  standardProjects: {
    [CardName.GIVE_PATENT]: {Factory: GivePatent},
    [CardName.FACILITY_SHARING]: {Factory: FacilitySharing},
    [CardName.TEAM_DONATION]: {Factory: DonationAction},
  },
});

import {Color} from '../../common/Color';
import {PartyName} from '../../common/turmoil/PartyName';
import {IGame} from '../IGame';
import {PoliticalAgendas} from '../turmoil/PoliticalAgendas';
import {Delegate, Turmoil} from '../turmoil/Turmoil';
import {DelegatesModel, PartyModel, PoliticalAgendasModel, TurmoilModel} from '../../common/models/TurmoilModel';
import {ConglomeratesExpansion} from '../conglomerates/ConglomeratesExpansion';
import {Agenda} from '../../common/turmoil/Types';

// More Parties games randomly select 6 of the 12 available parties (see
// Turmoil.createParties), so not every PartyName is necessarily in play this game --
// PoliticalAgendas.getAgenda throws for a party that isn't, so check first.
function getAgendaIfInPlay(turmoil: Turmoil, partyName: PartyName): Agenda | undefined {
  if (!turmoil.parties.some((party) => party.name === partyName)) {
    return undefined;
  }
  return PoliticalAgendas.getAgenda(turmoil, partyName);
}

export function getTurmoilModel(game: IGame): TurmoilModel | undefined {
  return Turmoil.ifTurmoilElse(game, (turmoil) => {
    const parties = getParties(game);
    let chairman: Color | undefined;

    if (turmoil.chairman) {
      chairman = delegateColor(turmoil.chairman);
    }
    const dominant = turmoil.dominantParty.name;
    const ruling = turmoil.rulingParty.name;

    const reserve: Array<DelegatesModel> = [];
    const lobby: Array<Color> = [];
    turmoil.delegateReserve.forEachMultiplicity((count, delegate) => {
      const color = delegateColor(delegate);
      if (delegate !== 'NEUTRAL') {
        if (!turmoil.usedFreeDelegateAction.has(delegate)) {
          count--;
          lobby.push(color);
        }
      }
      reserve.push({
        color: color,
        number: count,
      });
    });

    const politicalAgendas: PoliticalAgendasModel = {
      marsFirst: getAgendaIfInPlay(turmoil, PartyName.MARS),
      scientists: getAgendaIfInPlay(turmoil, PartyName.SCIENTISTS),
      unity: getAgendaIfInPlay(turmoil, PartyName.UNITY),
      greens: getAgendaIfInPlay(turmoil, PartyName.GREENS),
      reds: getAgendaIfInPlay(turmoil, PartyName.REDS),
      kelvinists: getAgendaIfInPlay(turmoil, PartyName.KELVINISTS),
      populists: getAgendaIfInPlay(turmoil, PartyName.POPULISTS),
      spome: getAgendaIfInPlay(turmoil, PartyName.SPOME),
      empower: getAgendaIfInPlay(turmoil, PartyName.EMPOWER),
      bureaucrats: getAgendaIfInPlay(turmoil, PartyName.BUREAUCRATS),
      centrists: getAgendaIfInPlay(turmoil, PartyName.CENTRISTS),
      transhumanists: getAgendaIfInPlay(turmoil, PartyName.TRANSHUMANISTS),
    };

    const policyActionUsers = Array.from(
      game.playersInGenerationOrder,
      (player) => {
        return {
          color: player.color,
          turmoilPolicyActionUsed: player.turmoilPolicyActionUsed,
          politicalAgendasActionUsedCount: player.politicalAgendasActionUsedCount};
      },
    );

    return {
      chairman,
      ruling,
      dominant,
      parties,
      lobby,
      reserve,
      distant: turmoil.distantGlobalEvent?.name,
      coming: turmoil.comingGlobalEvent?.name,
      current: turmoil.currentGlobalEvent?.name,
      politicalAgendas,
      policyActionUsers,
    };
  },
  () => undefined);
}

function getParties(game: IGame): Array<PartyModel> {
  return Turmoil.ifTurmoilElse(game,
    (turmoil) => {
      return turmoil.parties.map(function(party) {
        const delegates: Array<DelegatesModel> = [];
        for (const player of party.delegates.keys()) {
          const number = party.delegates.count(player);
          delegates.push({
            color: delegateColor(player),
            number,
          });
        }
        const partyLeader = party.partyLeader === undefined ? undefined : delegateColor(party.partyLeader);
        return {
          name: party.name,
          partyLeader: partyLeader,
          delegates: delegates,
        };
      });
    },
    () => []);
}

function delegateColor(delegate: Delegate): Color {
  if (delegate === 'NEUTRAL') {
    return 'neutral';
  }
  return ConglomeratesExpansion.teamDisplayColor(delegate) ?? delegate.color;
}

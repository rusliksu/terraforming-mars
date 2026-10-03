import {ChoosePoliticalAgenda} from '../deferredActions/ChoosePoliticalAgenda';
import {ChooseNewPartyAgenda} from '../deferredActions/ChooseNewPartyAgenda';
import {IGame} from '../IGame';
import {IBonus} from './Bonus';
import {IParty} from './parties/IParty';
import {PartyName} from '../../common/turmoil/PartyName';
import {IPolicy} from './Policy';
import {Delegate, Turmoil} from './Turmoil';
import {Agenda, AgendaStyle} from '../../common/turmoil/Types';

export type PoliticalAgendasData = {
  agendas: Map<PartyName, Agenda>;
  agendaStyle: AgendaStyle;
}

export type SerializedPoliticalAgendasData = {
  agendas: Array<[PartyName, Agenda]>;
  agendaStyle: AgendaStyle;
}

export class PoliticalAgendas {
  public static randomElement = PoliticalAgendas.defaultRandomElement;

  public static newInstance(
    agendaStyle: AgendaStyle,
    parties: ReadonlyArray<IParty>): PoliticalAgendasData {
    const agendas: Map<PartyName, Agenda> = new Map();

    parties.forEach((p) => {
      if (agendaStyle === 'Standard') {
        agendas.set(p.name, {bonusId: p.bonuses[0].id, policyId: p.policies[0].id});
      } else {
        agendas.set(p.name, PoliticalAgendas.getRandomAgenda(p));
      }
    });

    return {
      agendas: agendas,
      agendaStyle: agendaStyle,
    };
  }

  // Public: also used by Turmoil.swapInParty (More Parties) to seed an agenda for a party that
  // enters play mid-game.
  public static getRandomAgenda(party: IParty): Agenda {
    const bonus: IBonus = PoliticalAgendas.randomElement(party.bonuses);
    const policy: IPolicy = PoliticalAgendas.randomElement(party.policies);

    return {bonusId: bonus.id, policyId: policy.id};
  }

  public static currentAgenda(turmoil: Turmoil): Agenda {
    return this.getAgenda(turmoil, turmoil.rulingParty.name);
  }

  public static getAgenda(turmoil: Turmoil, partyName: PartyName): Agenda {
    const agenda = turmoil.politicalAgendasData.agendas.get(partyName);
    if (agenda === undefined) {
      throw new Error('Invalid party: ' + partyName);
    }
    return agenda;
  }

  // The ruling party is already in power, and now it is time for the party to select an agenda.
  // Do not expect the method to return an activated agenda if the current agenda style is chairman
  // And a person is the chairman -- the end of this method will just defer selection until later.
  public static setNextAgenda(turmoil: Turmoil, game: IGame): void {
    const rulingParty = turmoil.rulingParty;
    const politicalAgendasData = turmoil.politicalAgendasData;
    const chairman = turmoil.chairman;
    if (chairman === undefined) {
      throw new Error('Chairman not defined');
    }

    // Agendas are static unless it's chosen by a chairperson, in which case
    // defer the selection.
    if (politicalAgendasData.agendaStyle === 'Chairman' && chairman !== 'NEUTRAL') {
      const agenda = this.getAgenda(turmoil, rulingParty.name);
      game.defer(new ChoosePoliticalAgenda(
        chairman,
        rulingParty,
        (bonusId) => {
          agenda.bonusId = bonusId;
          turmoil.onAgendaSelected(game);
        },
        (policyId) => {
          agenda.policyId = policyId;
          turmoil.onAgendaSelected(game);
        }));
    } else if (politicalAgendasData.agendaStyle === 'PartyLeaders') {
      // The ruling party's bonus can already change mid-generation via onPartyLeaderChange;
      // its policy is locked until now, when the confirmed chairman picks the next one.
      const agenda = this.getAgenda(turmoil, rulingParty.name);
      if (chairman === 'NEUTRAL') {
        agenda.policyId = this.getRandomAgenda(rulingParty).policyId;
        turmoil.onAgendaSelected(game);
      } else {
        game.defer(new ChooseNewPartyAgenda(chairman, rulingParty, 'policy', (_bonusId, policyId) => {
          if (policyId !== undefined) {
            agenda.policyId = policyId;
          }
          turmoil.onAgendaSelected(game);
        }));
      }
    } else {
      turmoil.onAgendaSelected(game);
    }
  }

  // More Parties: fired whenever a party's leader changes (including a first assignment).
  // A real player who becomes leader chooses that party's new bonus, and its policy too
  // unless the party is currently ruling (policy stays locked until the next Chairman
  // election). A neutral leader randomizes the same unlocked parts of the agenda.
  public static onPartyLeaderChange(turmoil: Turmoil, party: IParty, newLeader: Delegate, game: IGame): void {
    if (turmoil.politicalAgendasData.agendaStyle !== 'PartyLeaders') {
      return;
    }
    const agenda = this.getAgenda(turmoil, party.name);
    const isRuling = turmoil.rulingParty.name === party.name;
    if (newLeader === 'NEUTRAL') {
      const random = this.getRandomAgenda(party);
      agenda.bonusId = random.bonusId;
      if (!isRuling) {
        agenda.policyId = random.policyId;
      }
      return;
    }
    const choice = isRuling ? 'bonus' : 'both';
    game.defer(new ChooseNewPartyAgenda(newLeader, party, choice, (bonusId, policyId) => {
      if (bonusId !== undefined) {
        agenda.bonusId = bonusId;
      }
      if (policyId !== undefined) {
        agenda.policyId = policyId;
      }
    }));
  }

  public static serialize(agenda: PoliticalAgendasData): SerializedPoliticalAgendasData {
    return {
      agendas: Array.from(agenda.agendas.entries()),
      agendaStyle: agenda.agendaStyle,
    };
  }

  public static deserialize(d: SerializedPoliticalAgendasData): PoliticalAgendasData {
    return {
      agendas: new Map(d.agendas),
      agendaStyle: d.agendaStyle,
    };
  }

  // Overridable for tests
  public static defaultRandomElement<T>(list: ReadonlyArray<T>): T {
    const rng = Math.floor(Math.random() * list.length);
    return list[rng];
  }
}

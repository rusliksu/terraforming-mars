import {PartyName} from './PartyName';

export type AgendaStyle =
  /** Use the standard policies and bonuses. */
  'Standard' |
  /** Randomly choose policies and bonuses, which remain for the entire game. */
  'Random' |
  /** The incoming chairman sets the incoming policy and bonus each generation. */
  'Chairman' |
  /**
   * More Parties: whoever becomes (or already is) a party's leader immediately chooses
   * that party's bonus, and its policy too unless the party is currently ruling (its policy
   * stays locked until the next Chairman election). A neutral delegate becoming leader
   * re-randomizes both instead. Forced on whenever the More Parties expansion is enabled.
   */
  'PartyLeaders';

const PARTIES = ['m', 's', 'u', 'k', 'r', 'g', 'pop', 'spo', 'emp', 'bur', 'cen', 'tra'] as const;
const BONUS_SUFFIXES = ['b01', 'b02'] as const;
const POLICY_SUFFIXES = ['p01', 'p02', 'p03', 'p04'] as const;

type Party = typeof PARTIES[number];
type BonusSuffix = typeof BONUS_SUFFIXES[number]
type PolicySuffix = typeof POLICY_SUFFIXES[number];

export type BonusId = `${Party}${BonusSuffix}`;
export type PolicyId = `${Party}${PolicySuffix}`

/* A party's policy (and ruling bonus). Can vary based on the agenda style. */
export type Agenda = {
  bonusId: BonusId;
  policyId: PolicyId;
}

export const BONUS_IDS: ReadonlyArray<BonusId> = PARTIES.flatMap((p) => BONUS_SUFFIXES.map((s) => `${p}${s}` as BonusId));
export const POLICY_IDS: ReadonlyArray<PolicyId> = PARTIES.flatMap((p) => POLICY_SUFFIXES.map((s) => `${p}${s}` as PolicyId));

/** When player has Mars Frontier Alliance, this is their political party alliance. */
export type AlliedParty = {
  partyName: PartyName;
  agenda: Agenda;
};

const names: Record<Party, PartyName> = {
  m: PartyName.MARS,
  s: PartyName.SCIENTISTS,
  u: PartyName.UNITY,
  k: PartyName.KELVINISTS,
  r: PartyName.REDS,
  g: PartyName.GREENS,
  pop: PartyName.POPULISTS,
  spo: PartyName.SPOME,
  emp: PartyName.EMPOWER,
  bur: PartyName.BUREAUCRATS,
  cen: PartyName.CENTRISTS,
  tra: PartyName.TRANSHUMANISTS,
} as const;

export type AgendaInfo = {
  name: PartyName;
  type: 'Bonus' | 'Policy';
  num: string;
};

export function agendaInfoById(id: BonusId | PolicyId): AgendaInfo {
  // The suffix (bonus/policy marker + 2-digit number) is always exactly 3 characters -- 'b01',
  // 'b02', 'p01'..'p04' -- regardless of how long the party prefix itself is (1 character for
  // the 6 official parties, up to 3 for the 6 More Parties ones, e.g. 'bur').
  const suffix = id.slice(-3);
  const p = id.slice(0, -3) as Party;
  const type: 'Bonus' | 'Policy' = suffix[0] === 'b' ? 'Bonus' : 'Policy';
  const num = suffix.slice(1);
  const name = names[p];
  return {name, type, num};
}

export function agendaIdDescription(id: BonusId | PolicyId): string {
  const info = agendaInfoById(id);
  return `${info.name} ${info.type} ${info.num}`;
}

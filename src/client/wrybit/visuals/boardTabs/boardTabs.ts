// Wrybit tab presentation over our public game models and parameter configuration.
import {GameModel} from '@/common/models/GameModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {PartyName} from '@/common/turmoil/PartyName';
import {MAXIMUM_MOON_RATE} from '@/common/constants';
import {resolveGlobalParameters, ParameterTrack} from '@/common/GlobalParameterConfig';
import {PLANETARY_TRACKS} from '@/common/pathfinders/PlanetaryTracks';
import {PathfindersModel} from '@/common/models/PathfindersModel';
import {Color} from '@/common/Color';

export type BoardTabId = 'mars' | 'moon' | 'colonies' | 'turmoil' | 'paths' | 'delta' | 'venus' | 'orbit' | 'teams';

export const BOARD_TAB_TONE: Record<BoardTabId, string> = {
  mars: 'mars', moon: 'moon', colonies: 'colonies', turmoil: 'colonies', paths: 'paths', delta: 'delta',
  venus: 'ocean', orbit: 'moon', teams: 'player',
};
export const BOARD_TAB_LABEL: Record<BoardTabId, string> = {
  mars: 'Mars', moon: 'Moon', colonies: 'Colonies', turmoil: 'Turmoil', paths: 'Planets', delta: 'Delta',
  venus: 'Venus', orbit: 'High Orbit Market', teams: 'Conglomerates',
};

export function boardTabs(game: GameModel): Array<BoardTabId> {
  const tabs: Array<BoardTabId> = ['mars'];
  if (game.moon !== undefined) {
    tabs.push('moon');
  }
  if (game.colonies.length > 0) {
    tabs.push('colonies');
  }
  if (game.turmoil !== undefined) {
    tabs.push('turmoil');
  }
  if (game.gameOptions.expansions.pathfinders && game.pathfinders !== undefined) {
    tabs.push('paths');
  }
  if (game.gameOptions.expansions.deltaProject) {
    tabs.push('delta');
  }
  if (game.venusPhase2 !== undefined) {
    tabs.push('venus');
  }
  if (game.highOrbitMarket !== undefined) {
    tabs.push('orbit');
  }
  if (game.conglomerates !== undefined) {
    tabs.push('teams');
  }
  return tabs;
}

export type BoardTabTrack = {
  color: string;
  step: number;
  total: number;
  bonus: ReadonlyArray<number>;
  markers?: ReadonlyArray<{at: number, color: Color}>;
};

// The six original Wrybit tones; additional parties use our existing party palette.
const PARTY_COLOR: Record<PartyName, string> = {
  [PartyName.MARS]: '#c0633a', [PartyName.SCIENTISTS]: '#5b7bd5', [PartyName.UNITY]: '#9aa6b8',
  [PartyName.GREENS]: '#4caf50', [PartyName.REDS]: '#d9443a', [PartyName.KELVINISTS]: '#e08a2e',
  [PartyName.POPULISTS]: '#d6249f', [PartyName.SPOME]: '#a4d90c', [PartyName.EMPOWER]: '#8e44ad',
  [PartyName.BUREAUCRATS]: '#c4c4c4', [PartyName.CENTRISTS]: '#f1c40f', [PartyName.TRANSHUMANISTS]: '#17c9d1',
};

function parameterTrack(track: ParameterTrack, value: number, color: string): BoardTabTrack {
  const position = (level: number) => (level - track.min) / track.step;
  return {color, step: position(value), total: position(track.max), bonus: track.bonuses.map((bonus) => position(bonus.value))};
}

const PLANET_TRACK_KEYS: ReadonlyArray<keyof PathfindersModel> = ['venus', 'earth', 'mars', 'jovian', 'moon'];

export function boardTabTracks(game: GameModel, players: ReadonlyArray<PublicPlayerModel>, id: BoardTabId): Array<BoardTabTrack> {
  switch (id) {
  case 'mars': {
    const config = resolveGlobalParameters(game.gameOptions.globalParameters, game.venusPhase2 !== undefined, game.gameOptions.altVenusBoard ? 60 : 30);
    const tracks = [parameterTrack(config.temperature, game.temperature, '#e5533d'), parameterTrack(config.oxygen, game.oxygenLevel, '#5cb85c'),
      {color: '#3f8ed8', step: game.oceans, total: config.oceans.max, bonus: []}];
    if (game.gameOptions.expansions.venus) {
      tracks.push(parameterTrack(config.venus, game.venusScaleLevel, '#d9a83a'));
    }
    return tracks;
  }
  case 'moon':
    return game.moon === undefined ? [] : [
      {color: '#6fc3df', step: game.moon.habitatRate, total: MAXIMUM_MOON_RATE, bonus: [3, 6]},
      {color: '#c9ccd3', step: game.moon.logisticRate, total: MAXIMUM_MOON_RATE, bonus: [3, 6]},
      {color: '#b88a5a', step: game.moon.miningRate, total: MAXIMUM_MOON_RATE, bonus: [3, 6]},
    ];
  case 'colonies':
    return game.colonies.filter((colony) => colony.isActive).map((colony) => ({color: '#2fb0a8', step: colony.trackPosition + 1, total: 7, bonus: []}));
  case 'turmoil':
    return (game.turmoil?.parties ?? []).filter((party) => party.delegates.length > 0)
      .map((party) => ({color: PARTY_COLOR[party.name], step: party.delegates.reduce((sum, delegate) => sum + delegate.number, 0), total: 6, bonus: []}));
  case 'paths': {
    const pathfinders = game.pathfinders;
    return pathfinders === undefined ? [] : PLANET_TRACK_KEYS.map((key) => {
      const spaces = PLANETARY_TRACKS[key].spaces;
      const bonus = spaces.map((space, index) => ((space.everyone.length + space.risingPlayer.length + space.mostTags.length) > 0 ? index : -1)).filter((index) => index > 0);
      return {color: '#d9a83a', step: pathfinders[key], total: spaces.length - 1, bonus};
    });
  }
  case 'delta':
    return [{color: '#f4f5f8', step: 0, total: 13, bonus: [11, 12],
      markers: players.flatMap((player) => [{at: player.deltaProject?.position ?? 0, color: player.color},
        ...(player.epsilonDample === undefined ? [] : [{at: player.epsilonDample.position, color: player.color}])])}];
  default:
    return [];
  }
}

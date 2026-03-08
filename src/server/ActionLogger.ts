import {IGame} from './IGame';
import {IPlayer} from './IPlayer';
import * as fs from 'fs';
import * as path from 'path';

interface PlayerSnapshot {
  id: string;
  color: string;
  name: string;
  tr: number;
  mc: number;
  steel: number;
  titanium: number;
  plants: number;
  energy: number;
  heat: number;
  prodMc: number;
  prodSteel: number;
  prodTi: number;
  prodPlants: number;
  prodEnergy: number;
  prodHeat: number;
  cardsInHand: number;
  tableau: number;
  actionsTakenThisRound: number;
  actionsTakenThisGame: number;
}

interface GameSnapshot {
  generation: number;
  temperature: number;
  oxygen: number;
  oceans: number;
  venus: number;
  gameAge: number;
  players: Array<PlayerSnapshot>;
}

export interface ActionLogEntry {
  timestamp: number;
  gameId: string;
  generation: number;
  saveId: number;
  activePlayer: string;
  activePlayerColor: string;
  inputType: string;
  before: GameSnapshot;
  after: GameSnapshot;
  deltas: {
    globals: Record<string, number>;
    players: Array<{
      id: string;
      color: string;
      name: string;
      resources: Record<string, number>;
      production: Record<string, number>;
      tr: number;
      cards: number;
      tableau: number;
    }>;
  };
  newLogs: Array<string>;
}

const LOG_DIR = path.join(process.cwd(), 'logs', 'actions');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, {recursive: true});
  }
}

function snapshotPlayer(player: IPlayer): PlayerSnapshot {
  return {
    id: player.id,
    color: player.color,
    name: player.name,
    tr: player.terraformRating,
    mc: player.megaCredits,
    steel: player.steel,
    titanium: player.titanium,
    plants: player.plants,
    energy: player.energy,
    heat: player.heat,
    prodMc: player.production.megacredits,
    prodSteel: player.production.steel,
    prodTi: player.production.titanium,
    prodPlants: player.production.plants,
    prodEnergy: player.production.energy,
    prodHeat: player.production.heat,
    cardsInHand: player.cardsInHand.length,
    tableau: player.tableau.length,
    actionsTakenThisRound: player.actionsTakenThisRound,
    actionsTakenThisGame: player.actionsTakenThisGame,
  };
}

function snapshotGame(game: IGame): GameSnapshot {
  return {
    generation: game.generation,
    temperature: game.getTemperature(),
    oxygen: game.getOxygenLevel(),
    oceans: game.board.getOceanSpaces().length,
    venus: game.getVenusScaleLevel(),
    gameAge: game.gameAge,
    players: game.playersInGenerationOrder.map(snapshotPlayer),
  };
}

function diff(before: number, after: number): number {
  return after - before;
}

function computeDeltas(before: GameSnapshot, after: GameSnapshot) {
  const globals: Record<string, number> = {};
  const dTemp = diff(before.temperature, after.temperature);
  const dOxy = diff(before.oxygen, after.oxygen);
  const dOceans = diff(before.oceans, after.oceans);
  const dVenus = diff(before.venus, after.venus);
  if (dTemp !== 0) globals.temperature = dTemp;
  if (dOxy !== 0) globals.oxygen = dOxy;
  if (dOceans !== 0) globals.oceans = dOceans;
  if (dVenus !== 0) globals.venus = dVenus;

  const players = before.players.map((bp) => {
    const ap = after.players.find((p) => p.id === bp.id);
    if (!ap) return {id: bp.id, color: bp.color, name: bp.name, resources: {}, production: {}, tr: 0, cards: 0, tableau: 0};

    const resources: Record<string, number> = {};
    const production: Record<string, number> = {};

    const dMc = diff(bp.mc, ap.mc); if (dMc !== 0) resources.mc = dMc;
    const dSteel = diff(bp.steel, ap.steel); if (dSteel !== 0) resources.steel = dSteel;
    const dTi = diff(bp.titanium, ap.titanium); if (dTi !== 0) resources.titanium = dTi;
    const dPlants = diff(bp.plants, ap.plants); if (dPlants !== 0) resources.plants = dPlants;
    const dEnergy = diff(bp.energy, ap.energy); if (dEnergy !== 0) resources.energy = dEnergy;
    const dHeat = diff(bp.heat, ap.heat); if (dHeat !== 0) resources.heat = dHeat;

    const dPMc = diff(bp.prodMc, ap.prodMc); if (dPMc !== 0) production.mc = dPMc;
    const dPSteel = diff(bp.prodSteel, ap.prodSteel); if (dPSteel !== 0) production.steel = dPSteel;
    const dPTi = diff(bp.prodTi, ap.prodTi); if (dPTi !== 0) production.titanium = dPTi;
    const dPPlants = diff(bp.prodPlants, ap.prodPlants); if (dPPlants !== 0) production.plants = dPPlants;
    const dPEnergy = diff(bp.prodEnergy, ap.prodEnergy); if (dPEnergy !== 0) production.energy = dPEnergy;
    const dPHeat = diff(bp.prodHeat, ap.prodHeat); if (dPHeat !== 0) production.heat = dPHeat;

    return {
      id: bp.id,
      color: bp.color,
      name: bp.name,
      resources,
      production,
      tr: diff(bp.tr, ap.tr),
      cards: diff(bp.cardsInHand, ap.cardsInHand),
      tableau: diff(bp.tableau, ap.tableau),
    };
  });

  return {globals, players};
}

function extractNewLogs(game: IGame, beforeTimestamp: number): Array<string> {
  const logs: Array<string> = [];
  for (let i = game.gameLog.length - 1; i >= 0; i--) {
    const entry = game.gameLog[i];
    if (entry.timestamp <= beforeTimestamp) break;
    let text = entry.message;
    for (let j = 0; j < entry.data.length; j++) {
      const d = entry.data[j];
      const val = d.value ?? '';
      text = text.replace('${' + j + '}', String(val));
    }
    logs.unshift(text);
  }
  return logs;
}

export class ActionLogger {
  private static beforeSnapshot: GameSnapshot | undefined;
  private static beforeLogTimestamp: number = 0;

  public static captureBeforeState(game: IGame): void {
    ActionLogger.beforeSnapshot = snapshotGame(game);
    ActionLogger.beforeLogTimestamp = Date.now();
  }

  public static captureAfterStateAndLog(game: IGame, player: IPlayer, inputType: string): void {
    if (!ActionLogger.beforeSnapshot) return;

    const before = ActionLogger.beforeSnapshot;
    const after = snapshotGame(game);
    const deltas = computeDeltas(before, after);
    const newLogs = extractNewLogs(game, ActionLogger.beforeLogTimestamp);

    const hasChanges = Object.keys(deltas.globals).length > 0 ||
      deltas.players.some((p) =>
        Object.keys(p.resources).length > 0 ||
        Object.keys(p.production).length > 0 ||
        p.tr !== 0 || p.cards !== 0 || p.tableau !== 0);

    if (!hasChanges && newLogs.length === 0) {
      ActionLogger.beforeSnapshot = undefined;
      return;
    }

    const entry: ActionLogEntry = {
      timestamp: Date.now(),
      gameId: game.id,
      generation: game.generation,
      saveId: game.lastSaveId,
      activePlayer: player.name,
      activePlayerColor: player.color,
      inputType,
      before,
      after,
      deltas,
      newLogs,
    };

    ActionLogger.writeLog(entry);
    ActionLogger.beforeSnapshot = undefined;
  }

  private static writeLog(entry: ActionLogEntry): void {
    try {
      ensureLogDir();
      const file = path.join(LOG_DIR, entry.gameId + '.jsonl');
      fs.appendFileSync(file, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('ActionLogger write error:', e);
    }
  }

  public static getGameLog(gameId: string): Array<ActionLogEntry> {
    try {
      const file = path.join(LOG_DIR, gameId + '.jsonl');
      if (!fs.existsSync(file)) return [];
      const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
      return lines.filter((l) => l.length > 0).map((line) => JSON.parse(line));
    } catch (e) {
      console.error('ActionLogger read error:', e);
      return [];
    }
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EloSyncService = void 0;
exports.normalizeEloIdentity = normalizeEloIdentity;
exports.normalizedPlaceScore = normalizedPlaceScore;
exports.buildEloGameFromSummary = buildEloGameFromSummary;
exports.rebuildEloData = rebuildEloData;
const fs = require("fs").promises;
const utils_1 = require("../../common/utils/utils");
const ICorporationCard_1 = require("../cards/corporation/ICorporationCard");
const EloPaths_1 = require("./EloPaths");
const DEFAULT_ELO = 1500;
const BASE_K = 32;
const PLAYER_ALIASES = {
    'gydro': 'GydRo',
    'ruslan': 'GydRo',
    'genuinegold': 'Илья',
    'лёха': 'Алексей',
    'леха': 'Алексей',
};
function emptyEloData() {
    return { players: {}, games: [] };
}
function normalizeEloIdentity(name) {
    const stripped = (name || '').trim();
    const canonical = PLAYER_ALIASES[stripped.toLowerCase()] || stripped || '?';
    return { key: canonical.toLowerCase(), displayName: canonical };
}
function getK(elo) {
    if (elo < 1400)
        return BASE_K * 1.2;
    if (elo < 1600)
        return BASE_K;
    if (elo < 1800)
        return BASE_K * 0.8;
    if (elo < 2000)
        return BASE_K * 0.6;
    return BASE_K * 0.4;
}
function expectedScore(myElo, oppElo) {
    return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}
function normalizedPlaceScore(place, playerCount) {
    if (playerCount <= 1)
        return 1;
    return Math.max(0, Math.min(1, 1 - ((place - 1) / (playerCount - 1))));
}
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
function createDefaultPlayer(displayName) {
    return {
        elo: DEFAULT_ELO,
        elo_vp: DEFAULT_ELO,
        displayName,
        games: 0,
        wins: 0,
        top3: 0,
        totalVP: 0,
        avgVP: 0,
        avgPlace: 0,
        avgPlaceScore: 0,
        corps: {},
        placeScoreSum: 0,
    };
}
function getOrCreatePlayer(players, key, displayName) {
    const existing = players[key];
    if (existing !== undefined) {
        existing.displayName = displayName;
        return existing;
    }
    const created = createDefaultPlayer(displayName);
    players[key] = created;
    return created;
}
function buildEloGameFromSummary(summary) {
    const sorted = summary.players
        .map((player) => {
        const normalized = normalizeEloIdentity(player.name);
        return {
            name: normalized.key,
            displayName: normalized.displayName,
            vp: player.vp,
            corp: player.corp || '',
        };
    })
        .sort((a, b) => b.vp - a.vp);
    const results = [];
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        let place = i + 1;
        if (i > 0 && current.vp === sorted[i - 1].vp) {
            place = results[i - 1].place;
        }
        results.push({
            name: current.name,
            displayName: current.displayName,
            place,
            vp: current.vp,
            corp: current.corp,
        });
    }
    return {
        _key: summary.key,
        date: new Date(summary.completedTime * 1000).toISOString(),
        server: summary.server,
        map: summary.map,
        generation: summary.generation,
        playerCount: results.length,
        completedTime: summary.completedTime,
        results,
    };
}
function rebuildEloData(games) {
    const normalizedGames = [...games]
        .filter((game) => Array.isArray(game.results) && game.results.length >= 2)
        .sort((a, b) => {
        const completedDelta = (a.completedTime || 0) - (b.completedTime || 0);
        if (completedDelta !== 0)
            return completedDelta;
        return a._key.localeCompare(b._key);
    });
    const players = {};
    for (const game of normalizedGames) {
        const entries = game.results;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const current = getOrCreatePlayer(players, entry.name, entry.displayName);
            const myElo = current.elo;
            let totalExpected = 0;
            let totalActual = 0;
            for (let j = 0; j < entries.length; j++) {
                if (i === j)
                    continue;
                const opp = entries[j];
                const opponent = getOrCreatePlayer(players, opp.name, opp.displayName);
                totalExpected += expectedScore(myElo, opponent.elo);
                if (entry.place < opp.place)
                    totalActual += 1;
                else if (entry.place === opp.place)
                    totalActual += 0.5;
            }
            const scaledK = getK(myElo) / (entries.length - 1) * 1.5;
            entry.oldElo = myElo;
            entry.newElo = Math.round(myElo + scaledK * (totalActual - totalExpected));
            entry.delta = entry.newElo - entry.oldElo;
        }
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const current = getOrCreatePlayer(players, entry.name, entry.displayName);
            const myEloVp = current.elo_vp;
            let totalExpected = 0;
            let totalActual = 0;
            for (let j = 0; j < entries.length; j++) {
                if (i === j)
                    continue;
                const opp = entries[j];
                const opponent = getOrCreatePlayer(players, opp.name, opp.displayName);
                totalExpected += expectedScore(myEloVp, opponent.elo_vp);
                if (entry.vp > opp.vp) {
                    const margin = Math.min((entry.vp - opp.vp) / 20, 1);
                    totalActual += 0.5 + margin * 0.5;
                }
                else if (entry.vp === opp.vp) {
                    totalActual += 0.5;
                }
                else {
                    const margin = Math.min((opp.vp - entry.vp) / 20, 1);
                    totalActual += 0.5 - margin * 0.5;
                }
            }
            const scaledK = getK(myEloVp) / (entries.length - 1) * 1.5;
            current.elo_vp = Math.round(myEloVp + scaledK * (totalActual - totalExpected));
        }
        for (const entry of entries) {
            const current = getOrCreatePlayer(players, entry.name, entry.displayName);
            current.displayName = entry.displayName;
            current.elo = entry.newElo ?? current.elo;
            current.games += 1;
            if (entry.place === 1)
                current.wins += 1;
            else if (entry.place < entries.length)
                current.wins += 0.5;
            if (entry.place <= 3)
                current.top3 += 1;
            current.placeScoreSum += normalizedPlaceScore(entry.place, entries.length);
            current.totalVP += entry.vp;
            if (entry.corp)
                current.corps[entry.corp] = (current.corps[entry.corp] || 0) + 1;
        }
    }
    const finalizedPlayers = {};
    for (const [key, player] of Object.entries(players)) {
        const avgPlace = player.games > 0 ? round3(player.placeScoreSum / player.games) : 0;
        finalizedPlayers[key] = {
            elo: player.elo,
            elo_vp: player.elo_vp,
            displayName: player.displayName,
            games: player.games,
            wins: player.wins,
            top3: player.top3,
            totalVP: player.totalVP,
            avgVP: player.games > 0 ? Math.round(player.totalVP / player.games) : 0,
            avgPlace,
            avgPlaceScore: avgPlace,
            corps: player.corps,
        };
    }
    return {
        players: finalizedPlayers,
        games: normalizedGames,
    };
}
function buildCompletedGameSummary(game) {
    return {
        key: game.id,
        completedTime: Math.floor(Date.now() / 1000),
        server: process.env.ELO_SERVER_NAME ?? 'server',
        map: String(game.gameOptions.boardName ?? ''),
        generation: game.generation,
        players: game.players.map((player) => ({
            name: player.name,
            vp: player.getVictoryPoints().total,
            corp: player.playedCards.filter(ICorporationCard_1.isICorporationCard).map(utils_1.toName).join('|'),
        })),
    };
}
async function loadJsonFile(file) {
    try {
        const raw = await fs.readFile(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return null;
        return {
            players: typeof parsed.players === 'object' && parsed.players !== null ? parsed.players : {},
            games: Array.isArray(parsed.games) ? parsed.games : [],
        };
    }
    catch (error) {
        const err = error;
        if (err && err.code === 'ENOENT')
            return null;
        return null;
    }
}
async function writeJsonAtomic(file, payload) {
    const tempFile = file + '.tmp';
    await fs.writeFile(tempFile, payload, 'utf8');
    await fs.rename(tempFile, file);
}
class EloSyncService {
    constructor(primaryPath = (0, EloPaths_1.getEloPrimaryPath)(), mirrorPath = (0, EloPaths_1.getEloMirrorPath)()) {
        this.primaryPath = primaryPath;
        this.mirrorPath = mirrorPath;
        this.queue = Promise.resolve();
    }
    static getInstance() {
        if (EloSyncService.instance === undefined) {
            EloSyncService.instance = new EloSyncService();
        }
        return EloSyncService.instance;
    }
    async recordCompletedGame(game) {
        await this.recordCompletedGameSummary(buildCompletedGameSummary(game));
    }
    async recordCompletedGameSummary(summary) {
        if ((summary.players || []).length < 2)
            return;
        const task = this.queue.then(() => this.persistSummary(summary));
        this.queue = task.catch(() => undefined);
        await task;
    }
    async persistSummary(summary) {
        const current = await this.loadCurrentData();
        const record = buildEloGameFromSummary(summary);
        const mergedGames = current.games.filter((game) => game._key !== record._key);
        mergedGames.push(record);
        const rebuilt = rebuildEloData(mergedGames);
        await this.save(rebuilt);
    }
    async loadCurrentData() {
        return (await loadJsonFile(this.primaryPath)) ??
            (await loadJsonFile(this.mirrorPath)) ??
            emptyEloData();
    }
    async save(data) {
        const payload = JSON.stringify(data, null, 2);
        await fs.mkdir(getParentDir(this.primaryPath), { recursive: true });
        await fs.mkdir(getParentDir(this.mirrorPath), { recursive: true });
        await writeJsonAtomic(this.primaryPath, payload);
        await writeJsonAtomic(this.mirrorPath, payload);
    }
}
exports.EloSyncService = EloSyncService;
function getParentDir(file) {
    const idx = Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\'));
    return idx === -1 ? '.' : file.slice(0, idx);
}

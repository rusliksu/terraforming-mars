"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerInput = void 0;
const responses = require("../server/responses");
const ServerModel_1 = require("../models/ServerModel");
const Handler_1 = require("./Handler");
const OrOptions_1 = require("../inputs/OrOptions");
const UndoActionOption_1 = require("../inputs/UndoActionOption");
const Types_1 = require("../../common/Types");
const fs = require("fs");
const path = require("path");
const server_ids_1 = require("../utils/server-ids");
const AppError_1 = require("../server/AppError");
const statusCode_1 = require("../../common/http/statusCode");
const InputError_1 = require("../inputs/InputError");
const IProjectCard_1 = require("../cards/IProjectCard");
const AppErrorId_1 = require("../../common/app/AppErrorId");
class PlayerInput extends Handler_1.Handler {
    async post(req, res, ctx) {
        const playerId = ctx.url.searchParams.get('id');
        if (playerId === null) {
            responses.badRequest(req, res, 'missing id parameter');
            return;
        }
        if (!(0, Types_1.isPlayerId)(playerId)) {
            responses.badRequest(req, res, 'invalid player id');
            return;
        }
        ctx.ipTracker.addParticipant(playerId, ctx.ip);
        const game = await ctx.gameLoader.getGame(playerId);
        if (game === undefined) {
            responses.notFound(req, res);
            return;
        }
        let player;
        try {
            player = game.getPlayerById(playerId);
        }
        catch (err) {
            console.warn(`unable to find player ${playerId}`, err);
        }
        if (player === undefined) {
            responses.notFound(req, res);
            return;
        }
        return this.processInput(req, res, ctx, player);
    }
    isWaitingForUndo(player, entity) {
        const waitingFor = player.getWaitingFor();
        if (entity.type === 'or' && waitingFor instanceof OrOptions_1.OrOptions) {
            const idx = entity.index;
            return waitingFor.options[idx] instanceof UndoActionOption_1.UndoActionOption;
        }
        return false;
    }
    async performUndo(_req, _res, ctx, player) {
        const lastSaveId = player.game.lastSaveId - 2;
        try {
            const game = await ctx.gameLoader.restoreGameAt(player.game.id, lastSaveId);
            if (game === undefined) {
                player.game.log('Unable to perform undo operation. Error retrieving game from database. Please try again.', () => { }, { reservedFor: player });
            }
            else {
                player = game.getPlayerById(player.id);
            }
        }
        catch (err) {
            console.error(err);
        }
        return player;
    }
    processInput(req, res, ctx, player) {
        for (const card of player.tableau) {
            card.warnings.clear();
            if ((0, IProjectCard_1.isIProjectCard)(card)) {
                card.additionalProjectCosts = undefined;
            }
        }
        return new Promise((resolve) => {
            let body = '';
            req.on('data', (data) => {
                body += data.toString();
            });
            req.once('end', async () => {
                let entityForLog = undefined;
                let isUndo = false;
                let promptSnapshot = emptyPromptSnapshot();
                let promptInputSeq = null;
                let inputSeq = null;
                try {
                    const entity = JSON.parse(body);
                    entityForLog = cloneEntityForLog(entity);
                    promptSnapshot = capturePromptSnapshot(player.getWaitingFor());
                    promptInputSeq = player.game.shadowInputSeq ?? 0;
                    validateRunId(entity);
                    isUndo = this.isWaitingForUndo(player, entity);
                    if (isUndo) {
                        player = await this.performUndo(req, res, ctx, player);
                        inputSeq = advanceShadowInputSeq(player, promptInputSeq);
                        responses.writeJson(res, ctx, ServerModel_1.Server.getPlayerModel(player));
                    }
                    else {
                        inputSeq = advanceShadowInputSeq(player, promptInputSeq);
                        const previousSaveGamePromise = player.game.saveGamePromise;
                        try {
                            player.process(entity);
                        }
                        catch (err) {
                            player.game.shadowInputSeq = promptInputSeq;
                            inputSeq = null;
                            throw err;
                        }
                        if (player.game.saveGamePromise !== previousSaveGamePromise) {
                            await player.game.saveGamePromise;
                        }
                        responses.writeJson(res, ctx, ServerModel_1.Server.getPlayerModel(player));
                    }
                    appendShadowInputLog(player, entityForLog, body, promptSnapshot, promptInputSeq, inputSeq, isUndo, 'accepted');
                    resolve();
                }
                catch (e) {
                    appendShadowInputLog(player, entityForLog, body, promptSnapshot, promptInputSeq, inputSeq, isUndo, 'rejected', e);
                    if (!(e instanceof AppError_1.AppError || e instanceof InputError_1.InputError)) {
                        console.warn('Error processing input from player', e);
                    }
                    res.writeHead(statusCode_1.statusCode.badRequest, {
                        'Content-Type': 'application/json',
                    });
                    const id = e instanceof AppError_1.AppError ? e.id : undefined;
                    const message = e instanceof Error ? e.message : String(e);
                    const response = {
                        id: id,
                        message: message,
                    };
                    res.write(JSON.stringify(response));
                    res.end();
                    resolve();
                }
            });
        });
    }
}
exports.PlayerInput = PlayerInput;
PlayerInput.INSTANCE = new PlayerInput();
function appendShadowInputLog(player, entity, rawBody, promptSnapshot, promptInputSeq, inputSeq, isUndo, result, error) {
    if (entity === undefined || process.env.SHADOW_LOG !== '1') {
        return;
    }
    try {
        const logDir = process.env.SHADOW_LOG_DIR || path.resolve(process.cwd(), 'shadow-logs');
        const filePrefix = process.env.SHADOW_LOG_FILE_PREFIX || 'input';
        fs.mkdirSync(logDir, { recursive: true });
        const logFile = path.join(logDir, `${filePrefix}-${player.game.id}.jsonl`);
        const entry = {
            ts: new Date().toISOString(),
            source: 'player-input',
            result,
            serverRunId: server_ids_1.runId ?? null,
            gameId: player.game.id,
            promptInputSeq,
            inputSeq,
            generation: player.game.generation,
            gameAge: player.game.gameAge,
            playerId: player.id,
            player: player.name,
            color: player.color,
            promptType: promptSnapshot.type,
            promptTitle: promptSnapshot.title,
            promptButtonLabel: promptSnapshot.buttonLabel,
            inputType: typeof entity.type === 'string' ? entity.type : null,
            isUndo,
            playerAction: entity,
            rawBody,
            mc: player.megaCredits ?? 0,
            tr: player.getTerraformRating(),
            errorId: error instanceof AppError_1.AppError ? error.id : undefined,
            errorMessage: error instanceof Error ? error.message : undefined,
        };
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    }
    catch (_e) {
    }
}
function advanceShadowInputSeq(player, promptInputSeq) {
    const base = Math.max(player.game.shadowInputSeq ?? 0, promptInputSeq ?? 0);
    const nextSeq = base + 1;
    player.game.shadowInputSeq = nextSeq;
    return nextSeq;
}
function capturePromptSnapshot(waitingFor) {
    if (waitingFor === undefined || waitingFor === null) {
        return emptyPromptSnapshot();
    }
    return {
        buttonLabel: typeof waitingFor.buttonLabel === 'string' ? waitingFor.buttonLabel : null,
        title: extractPromptTitle(waitingFor.title),
        type: typeof waitingFor.type === 'string' ? waitingFor.type : null,
    };
}
function cloneEntityForLog(entity) {
    return JSON.parse(JSON.stringify(entity));
}
function emptyPromptSnapshot() {
    return { buttonLabel: null, title: null, type: null };
}
function extractPromptTitle(title) {
    if (typeof title === 'string') {
        return title;
    }
    if (title !== undefined && title !== null && typeof title === 'object') {
        const maybeMessage = title.message;
        if (typeof maybeMessage === 'string') {
            return maybeMessage;
        }
    }
    return null;
}
function validateRunId(entity) {
    if (entity.runId !== undefined && server_ids_1.runId !== undefined) {
        if (entity.runId !== server_ids_1.runId) {
            throw new AppError_1.AppError(AppErrorId_1.INVALID_RUN_ID, 'The server has restarted. Click OK to refresh this page.');
        }
    }
    delete entity.runId;
}

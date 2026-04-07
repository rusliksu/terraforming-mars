"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerInput = void 0;
const responses = require("../server/responses");
const ServerModel_1 = require("../models/ServerModel");
const Handler_1 = require("./Handler");
const OrOptions_1 = require("../inputs/OrOptions");
const UndoActionOption_1 = require("../inputs/UndoActionOption");
const Types_1 = require("../../common/Types");
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
    async performUndo(_req, res, ctx, player) {
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
        responses.writeJson(res, ctx, ServerModel_1.Server.getPlayerModel(player));
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
                try {
                    const entity = JSON.parse(body);
                    validateRunId(entity);
                    if (this.isWaitingForUndo(player, entity)) {
                        await this.performUndo(req, res, ctx, player);
                    }
                    else {
                        // Shadow log: record what player was asked and what they chose
                        try {
                            const wf = player.getWaitingFor();
                            if (wf && process.env.SHADOW_LOG !== '0') {
                                const fs = require('fs');
                                const path = require('path');
                                const logDir = process.env.SHADOW_LOG_DIR || path.resolve(process.cwd(), 'shadow-logs');
                                fs.mkdirSync(logDir, {recursive: true});
                                const logFile = path.join(logDir, `shadow-${player.game.id}.jsonl`);
                                const entry = {
                                    ts: new Date().toISOString(),
                                    gameId: player.game.id,
                                    gen: player.game.generation,
                                    player: player.name,
                                    color: player.color,
                                    promptType: wf.type || '',
                                    title: typeof wf.title === 'string' ? wf.title : (wf.title?.message || ''),
                                    playerAction: entity,
                                    mc: player.megaCredits ?? 0,
                                    tr: player.getTerraformRating(),
                                };
                                fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
                            }
                        } catch(_e) { /* shadow log error — don't block game */ }
                        const previousSaveGamePromise = player.game.saveGamePromise;
                        player.process(entity);
                        if (player.game.saveGamePromise !== previousSaveGamePromise) {
                            await player.game.saveGamePromise;
                        }
                        responses.writeJson(res, ctx, ServerModel_1.Server.getPlayerModel(player));
                    }
                    resolve();
                }
                catch (e) {
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
function validateRunId(entity) {
    if (entity.runId !== undefined && server_ids_1.runId !== undefined) {
        if (entity.runId !== server_ids_1.runId) {
            throw new AppError_1.AppError(AppErrorId_1.INVALID_RUN_ID, 'The server has restarted. Click OK to refresh this page.');
        }
    }
    delete entity.runId;
}

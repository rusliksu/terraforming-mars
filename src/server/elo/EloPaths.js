"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDynamicEloAssetPath = exports.resolveEloAssetPath = exports.getEloMirrorPath = exports.getEloPrimaryPath = exports.getEloDirectory = void 0;
const path = require("path");
function getEloDirectory() {
    return path.resolve(process.env.ELO_DATA_DIR ?? 'assets/elo');
}
exports.getEloDirectory = getEloDirectory;
function getEloPrimaryPath() {
    return path.join(getEloDirectory(), 'data.json');
}
exports.getEloPrimaryPath = getEloPrimaryPath;
function getEloMirrorPath() {
    return path.join(getEloDirectory(), 'elo-data.json');
}
exports.getEloMirrorPath = getEloMirrorPath;
function resolveEloAssetPath(urlPath) {
    switch (urlPath) {
        case 'elo/data.json':
            return getEloPrimaryPath();
        case 'elo/elo-data.json':
            return getEloMirrorPath();
        default:
            return undefined;
    }
}
exports.resolveEloAssetPath = resolveEloAssetPath;
function isDynamicEloAssetPath(urlPath) {
    return resolveEloAssetPath(urlPath) !== undefined;
}
exports.isDynamicEloAssetPath = isDynamicEloAssetPath;

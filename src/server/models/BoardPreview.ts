import {BoardName} from '../../common/boards/BoardName';
import {RandomBoardOption} from '../../common/boards/RandomBoardOption';
import {boardOptions} from '../../common/boards/boardOptions';
import {decodeCustomBoard} from '../../common/boards/customBoardCodec';
import {CardName} from '../../common/cards/CardName';
import {DEFAULT_EXPANSIONS, EXPANSIONS, Expansion} from '../../common/cards/GameModule';
import {BoardPreviewModel, BoardPreviewRequest} from '../../common/models/BoardPreviewModel';
import {BoardNameType} from '../../common/game/NewGameConfig';
import {Random, SeededRandom, UnseededRandom} from '../../common/utils/Random';
import {GameSetup} from '../GameSetup';
import {DEFAULT_GAME_OPTIONS} from '../game/GameOptions';
import {Server} from './ServerModel';

const CARD_NAMES: ReadonlySet<unknown> = new Set(Object.values(CardName));

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function boardName(value: unknown): value is BoardNameType {
  return Object.values(BoardName).some((name) => name === value) || Object.values(RandomBoardOption).some((name) => name === value);
}
function cardName(value: unknown): value is CardName {
  return CARD_NAMES.has(value);
}

export function parseBoardPreviewRequest(value: unknown): BoardPreviewRequest {
  if (!record(value) || !boardName(value.board) || typeof value.seed !== 'number' || !Number.isFinite(value.seed) ||
    value.seed < 0 || value.seed >= 1 || typeof value.shuffleMapOption !== 'boolean' || !record(value.expansions) ||
    !Array.isArray(value.includedCards) || value.includedCards.length > Object.keys(CardName).length || !value.includedCards.every(cardName) ||
    (value.customBoardCode !== undefined && typeof value.customBoardCode !== 'string')) {
    throw new Error('Invalid board preview options.');
  }
  const expansions: Record<Expansion, boolean> = {...DEFAULT_EXPANSIONS};
  for (const expansion of EXPANSIONS) {
    const enabled = value.expansions[expansion];
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      throw new Error('Invalid expansion option.');
    }
    expansions[expansion] = enabled === true;
  }
  return {board: value.board, seed: value.seed, shuffleMapOption: value.shuffleMapOption,
    expansions, includedCards: value.includedCards, customBoardCode: value.customBoardCode};
}

/** Builds a fresh public board through our factories without a Game, players or storage. */
export function createBoardPreview(request: BoardPreviewRequest, random: Random = UnseededRandom.INSTANCE): BoardPreviewModel {
  const choices = boardOptions(request.board);
  const randomExample = request.board === RandomBoardOption.ALL || request.board === RandomBoardOption.OFFICIAL;
  const boardName = randomExample ? choices[random.nextInt(choices.length)] : choices[0];
  if (boardName === BoardName.CUSTOM && request.customBoardCode === undefined) {
    throw new Error('A custom board code is required.');
  }
  const customBoard = boardName === BoardName.CUSTOM ? decodeCustomBoard(request.customBoardCode ?? '') : undefined;
  const board = GameSetup.newBoard({...DEFAULT_GAME_OPTIONS, boardName, customBoard,
    shuffleMapOption: request.shuffleMapOption, expansions: {...request.expansions}, includedCards: request.includedCards,
    coloniesExtension: request.expansions.colonies, venusNextExtension: request.expansions.venus,
    venusPhase2Expansion: request.expansions.venusPhase2, pathfindersExpansion: request.expansions.pathfinders,
    turmoilExtension: request.expansions.turmoil}, new SeededRandom(request.seed));
  const model: BoardPreviewModel = {boardName, spaces: Server.getSpaces(board), randomExample};
  if (customBoard !== undefined) {
    model.customBoardRows = customBoard.rows;
    if (customBoard.globalParameters !== undefined) {
      model.globalParameters = customBoard.globalParameters;
    }
  }
  return model;
}

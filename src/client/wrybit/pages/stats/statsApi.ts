import {Color} from '@/common/Color';
import {BoardName} from '@/common/boards/BoardName';
import {WrybitUiStatsGame, WrybitUiStatsSnapshot} from '@/common/models/WrybitUiStats';
import {StatsGame} from './StatsGame';

const COLORS: ReadonlyArray<Color> = ['red', 'yellow', 'green', 'blue', 'black', 'purple', 'orange', 'pink'];
const BOARDS: ReadonlyArray<string> = Object.values(BoardName);

function boardNameOf(map: string | undefined): BoardName | undefined {
  return map !== undefined && BOARDS.includes(map) ? map as BoardName : undefined;
}

/** Convert the narrow public projection into the source stats page model. Unknown details stay undefined. */
export function toStatsGames(snapshot: WrybitUiStatsSnapshot): Array<StatsGame> {
  return snapshot.games.map((game: WrybitUiStatsGame): StatsGame => {
    const players = game.results.map((result, index) => ({
      name: result.displayName,
      color: COLORS[index % COLORS.length],
      url: undefined,
      victoryPoints: result.victoryPoints,
      megaCredits: 0,
      isWinner: result.place === 1,
      corporation: result.corporation,
    }));
    return {
      summary: {
        id: game.id,
        source: 'local',
        createdTimeMs: game.date === undefined ? 0 : Date.parse(game.date),
        isFinished: true,
        generation: game.generations,
        spectatorUrl: undefined,
        externalUrl: undefined,
        importedParticipantId: undefined,
        screenshotUrl: undefined,
        players,
      },
      resultUrl: undefined,
      // The public ELO projection has no card/milestone/award/tile details. Keep those
      // empty; the board and seats are public facts, so the boards/player tabs can still
      // render them without inventing any game content.
      details: {
        source: 'screenshot',
        cardsComplete: false,
        boardName: boardNameOf(game.map),
        expansions: [],
        players: players.map((player) => ({name: player.name, cards: []})),
        milestones: [],
        awards: [],
      },
    };
  });
}
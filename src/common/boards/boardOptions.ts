import {BoardName} from './BoardName';
import {RandomBoardOption} from './RandomBoardOption';

export function boardOptions(board: RandomBoardOption | BoardName): Array<BoardName> {
  // A custom board needs its own definition and can't be chosen by a random roll.
  const allBoards = Object.values(BoardName).filter((name) => name !== BoardName.CUSTOM);

  if (board === RandomBoardOption.ALL) {
    return allBoards;
  }
  if (board === RandomBoardOption.OFFICIAL) {
    return allBoards.filter((name) => {
      return name === BoardName.THARSIS ||
        name === BoardName.HELLAS ||
        name === BoardName.ELYSIUM;
    });
  }
  return [board];
}

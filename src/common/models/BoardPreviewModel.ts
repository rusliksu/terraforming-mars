import {BoardName} from '../boards/BoardName';
import {BoardNameType} from '../game/NewGameConfig';
import {Expansion} from '../cards/GameModule';
import {CardName} from '../cards/CardName';
import {SpaceModel} from './SpaceModel';
import {GlobalParametersConfig} from '../GlobalParameterConfig';

/** Public layout options only; player identities and game capabilities are absent. */
export type BoardPreviewRequest = {
  board: BoardNameType;
  seed: number;
  shuffleMapOption: boolean;
  expansions: Readonly<Record<Expansion, boolean>>;
  includedCards: ReadonlyArray<CardName>;
  customBoardCode?: string;
};

export type BoardPreviewModel = {
  boardName: BoardName;
  spaces: ReadonlyArray<SpaceModel>;
  customBoardRows?: number;
  globalParameters?: GlobalParametersConfig;
  randomExample: boolean;
};

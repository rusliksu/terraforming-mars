import {Color} from '../Color';
import {Phase} from '../Phase';
import {GameId, SpectatorId} from '../Types';

export type LiveGamePlayerModel = {
  color: Color;
  name: string;
};

export type LiveGameModel = {
  id: GameId;
  phase: Phase;
  players: Array<LiveGamePlayerModel>;
  spectatorId: SpectatorId | undefined;
};

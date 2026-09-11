import {LogMessage} from '@/common/logs/LogMessage';
import {SpectatorId} from '@/common/Types';
import {SpectatorModel} from '@/common/models/SpectatorModel';

export type ReplayIndex = {
  name: string;
  spectatorId: SpectatorId;
  saveIds: ReadonlyArray<number>;
};

export type ReplayLogMessage = Pick<LogMessage, 'type' | 'message' | 'data' | 'timestamp' | 'canceled'>;

export type ReplayFrame = {
  saveId: number;
  view: SpectatorModel;
  logs: ReadonlyArray<ReplayLogMessage>;
};

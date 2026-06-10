import {LogMessageBuilder} from './LogMessageBuilder';
import {IPlayer} from '../IPlayer';
import {ParticipantId} from '@/common/Types';

export interface Logger {
  log(message: string, f?: (builder: LogMessageBuilder) => void, options?: {
    reservedFor?: IPlayer,
    reservedForParticipant?: ParticipantId,
    hiddenFor?: Array<ParticipantId>,
  }): void;
}

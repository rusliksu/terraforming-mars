import {LogMessageType} from './LogMessageType';
import {LogMessageData} from './LogMessageData';
import {Message} from './Message';
import {ParticipantId} from '../Types';
import {Color} from '../Color';
import {Resource} from '../Resource';

export type LogEffect =
  | {kind: 'resource', resource: Resource, production: boolean, amount: number, player: Color}
  | {kind: 'tr', amount: number, player: Color};

export type LogPayment = {megacredits: number, steel: number, titanium: number, energy?: number};

export class LogMessage implements Message {
  public playerId?: ParticipantId;
  public hiddenFor?: Array<ParticipantId>;
  public canceled?: boolean;
  public actionId?: string;
  public actionStart?: boolean;
  public actionEnd?: boolean;
  public effect?: LogEffect;
  public payment?: LogPayment;
  public timestamp = Date.now();
  public type?: LogMessageType;
  constructor(
    type: LogMessageType,
    public message: string,
    public data: Array<LogMessageData>,
    // When set, this message is private for the specified participant.
    // Always filter messages so they're not sent to the wrong participant.
    playerId?: ParticipantId) {
    // setting in body to avoid setting property when
    // argument is undefined for less memory usage
    if (playerId !== undefined) {
      this.playerId = playerId;
    }
    // only store property if not default
    // for less memory usage. majority
    // of messages are default
    if (type !== LogMessageType.DEFAULT) {
      this.type = type;
    }
  }
}

import type {InputResponse} from '@/common/inputs/InputResponse';
import {inject, onBeforeUnmount, provide} from 'vue';
import type {InjectionKey} from 'vue';

export type SaveOutcome = 'saved' | 'cancelled' | 'invalid';
export type MaybePromise<T> = T | Promise<T>;
export type SaveAttempt = {
  readonly signal: AbortSignal;
  isCurrent(): boolean;
};
export type CollectedResponse = {outcome: 'saved', response: InputResponse} | {outcome: 'cancelled' | 'invalid'};
export type InputController = {
  readonly $data: Record<string, unknown>;
  saveData(attempt?: SaveAttempt, respond?: (response: InputResponse) => void): MaybePromise<SaveOutcome | void>;
  canSave?(): boolean;
};
export type InputCollector = InputController & {
  collectResponse(attempt: SaveAttempt): MaybePromise<CollectedResponse>;
};
export type SaveSession = {
  begin(): SaveAttempt | undefined;
  cancel(): void;
  finish(attempt: SaveAttempt): void;
};
export const SAVE_SESSION: InjectionKey<SaveSession> = Symbol('input-save-session');

export function useSaveSession(): SaveSession {
  const session = inject(SAVE_SESSION, undefined) ?? createSaveSession();
  provide(SAVE_SESSION, session);
  onBeforeUnmount(() => session.cancel());
  return session;
}

export function createSaveSession(): SaveSession {
  let current: {attempt: SaveAttempt, abort: AbortController} | undefined;
  return {
    begin() {
      if (current !== undefined) {
        return undefined;
      }
      const abort = new AbortController();
      const attempt: SaveAttempt = {signal: abort.signal, isCurrent: () => current?.attempt === attempt && !abort.signal.aborted};
      current = {attempt, abort};
      return attempt;
    },
    cancel() {
      const previous = current;
      current = undefined;
      previous?.abort.abort();
    },
    finish(attempt) {
      if (current?.attempt === attempt) {
        current = undefined;
      }
    },
  };
}

/** Preserve the existing synchronous path; only an actual confirmation creates a promise. */
export function afterSave<T, U>(result: MaybePromise<T>, complete: (value: T) => MaybePromise<U>): MaybePromise<U> {
  return result instanceof Promise ? result.then(complete) : complete(result);
}

export function withSaveAttempt(session: SaveSession, supplied: SaveAttempt | undefined, work: (attempt: SaveAttempt) => MaybePromise<SaveOutcome>): MaybePromise<SaveOutcome> {
  if (supplied !== undefined) {
    return supplied.isCurrent() ? work(supplied) : 'cancelled';
  }
  const attempt = session.begin();
  if (attempt === undefined) {
    return 'cancelled';
  }
  try {
    const result = work(attempt);
    const finish = (outcome: SaveOutcome): SaveOutcome => {
      session.finish(attempt);
      return outcome;
    };
    if (result instanceof Promise) {
      return result.then(finish, (error) => {
        if (attempt.isCurrent()) {
          session.cancel();
        }
        throw error;
      });
    }
    return finish(result);
  } catch (error) {
    if (attempt.isCurrent()) {
      session.cancel();
    }
    throw error;
  }
}

/** The same JSON boundary our WaitingFor sends, detached from subsequent draft edits. */
export function copyInputResponse(response: InputResponse): InputResponse {
  return JSON.parse(JSON.stringify(response));
}

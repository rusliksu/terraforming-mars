export const INVALID_RUN_ID = '#invalid-run-id' as const;
export const UNDO_REVEALED_HIDDEN_INFORMATION = '#undo-revealed-hidden-information' as const;
export const STALE_PROMPT = '#stale-prompt' as const;
export const RESPONDING_TOO_QUICKLY = '#responding-too-quickly' as const;
export type AppErrorId = typeof INVALID_RUN_ID | typeof UNDO_REVEALED_HIDDEN_INFORMATION | typeof STALE_PROMPT | typeof RESPONDING_TOO_QUICKLY;

export type AppErrorResponse = {
  id: AppErrorId | undefined;
  message: string;
}

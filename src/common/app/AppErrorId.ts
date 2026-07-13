export const INVALID_RUN_ID = '#invalid-run-id' as const;
export const UNDO_REVEALED_HIDDEN_INFORMATION = '#undo-revealed-hidden-information' as const;
export type AppErrorId = '#invalid-run-id' | '#undo-revealed-hidden-information';

export type AppErrorResponse = {
  id: AppErrorId | undefined;
  message: string;
}

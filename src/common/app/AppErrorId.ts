export const INVALID_RUN_ID = '#invalid-run-id' as const;
export const CONFIRM_UNDO_AFTER_HIDDEN_INFORMATION = '#confirm-undo-after-hidden-information' as const;
export type AppErrorId = typeof INVALID_RUN_ID | typeof CONFIRM_UNDO_AFTER_HIDDEN_INFORMATION;

export type AppErrorResponse = {
  id: AppErrorId | undefined;
  message: string;
}

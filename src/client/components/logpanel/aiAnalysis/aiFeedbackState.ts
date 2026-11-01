import {markRaw, reactive} from 'vue';
import {paths} from '@/common/app/paths';
import {Color} from '@/common/Color';
import {ParticipantId} from '@/common/Types';
import {AiFeedbackEntry, AiFeedbackRating, AiFeedbackRequest} from '@/common/ai/AiFeedback';
import {AiDecisionSummary} from '@/common/ai/AiDecisionSummary';
import {LogMessage} from '@/common/logs/LogMessage';
import {ViewModel} from '@/common/models/PlayerModel';

// Ratings of the current analysis game and the open rating dialog. Module state: the game view
// remounts on updates (every AI move), the dialog lives in the log panel and must survive that.

/** Row of the log that can be rated: an AI line with a stable id. */
export type AiLogTarget = {
  message: LogMessage,
  messageId: string,
  decisionId?: string,
  color: Color,
};

type OpenDialog = {
  target: AiLogTarget,
  decision: AiDecisionSummary | undefined,
  // All AI rows of the log in order and the decisions by id: the dialog steps to the previous/next one
  targets: ReadonlyArray<AiLogTarget>,
  summaries: ReadonlyMap<string, AiDecisionSummary>,
  viewModel: ViewModel,
  rating: AiFeedbackRating | undefined,
};

type State = {
  participantId: ParticipantId | undefined,
  ratings: Array<AiFeedbackEntry>,
  dialog: OpenDialog | undefined,
  error: string | undefined,
};

export const aiFeedbackState = reactive<State>({
  participantId: undefined,
  ratings: [],
  dialog: undefined,
  error: undefined,
});

const feedbackUrl = (participantId: ParticipantId): string => paths.API_AI_FEEDBACK + '?id=' + participantId;

/** Loads all ratings of the game (everyone sees everyone's ratings). */
export async function loadAiFeedback(participantId: ParticipantId): Promise<void> {
  if (aiFeedbackState.participantId !== participantId) {
    aiFeedbackState.participantId = participantId;
    aiFeedbackState.ratings = [];
  }
  try {
    const response = await fetch(feedbackUrl(participantId));
    if (response.ok) {
      aiFeedbackState.ratings = await response.json();
    }
  } catch {
    // Ratings are an extra: the log works without them, the next update tries again
  }
}

/** Saves (or with rating undefined removes) the own rating of a line; throws the server's reason. */
export async function saveAiFeedback(participantId: ParticipantId, request: AiFeedbackRequest): Promise<void> {
  const response = await fetch(feedbackUrl(participantId), {method: 'POST', body: JSON.stringify(request)});
  if (!response.ok) {
    throw new Error(await response.text());
  }
  aiFeedbackState.ratings = await response.json();
}

export function ratingsOf(messageId: string): Array<AiFeedbackEntry> {
  return aiFeedbackState.ratings.filter((entry) => entry.messageId === messageId);
}

export function openAiDecision(target: AiLogTarget, decision: AiDecisionSummary | undefined, viewModel: ViewModel, rating?: AiFeedbackRating,
  targets: ReadonlyArray<AiLogTarget> = [], summaries: ReadonlyMap<string, AiDecisionSummary> = new Map()): void {
  aiFeedbackState.error = undefined;
  aiFeedbackState.dialog = markRaw({target, decision, targets, summaries, viewModel, rating});
}

/** Position of the open row among all AI rows, or -1. */
export function openAiDecisionIndex(): number {
  const dialog = aiFeedbackState.dialog;
  return dialog === undefined ? -1 : dialog.targets.findIndex((target) => target.messageId === dialog.target.messageId);
}

/** Opens the previous (-1) or next (+1) AI row; at the ends nothing happens. */
export function stepAiDecision(step: -1 | 1): void {
  const dialog = aiFeedbackState.dialog;
  if (dialog === undefined) {
    return;
  }
  const next = dialog.targets[openAiDecisionIndex() + step];
  if (next !== undefined) {
    openAiDecision(next, next.decisionId === undefined ? undefined : dialog.summaries.get(next.decisionId), dialog.viewModel, undefined, dialog.targets, dialog.summaries);
  }
}

export function closeAiDecision(): void {
  aiFeedbackState.dialog = undefined;
  aiFeedbackState.error = undefined;
}

/** Target of an AI line, or undefined when the line is not an AI analysis line. */
export function targetOf(message: LogMessage): AiLogTarget | undefined {
  if (message.id === undefined || message.aiInsight === undefined) {
    return undefined;
  }
  return {message, messageId: message.id, decisionId: message.aiDecisionId, color: message.aiInsight};
}

/** Decision summaries by id: only the first line of a decision carries the options. */
export function decisionSummaries(messages: Iterable<LogMessage>): Map<string, AiDecisionSummary> {
  const summaries = new Map<string, AiDecisionSummary>();
  for (const message of messages) {
    if (message.aiDecision !== undefined) {
      summaries.set(message.aiDecision.id, message.aiDecision);
    }
  }
  return summaries;
}

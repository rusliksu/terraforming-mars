import {Message} from '../../common/logs/Message';
import {PlayerInputModel} from '../../common/models/PlayerInputModel';

function titleText(title: string | Message): string {
  if (typeof title === 'string') {
    return title;
  }
  try {
    return title.message + JSON.stringify(title.data);
  } catch {
    return title.message;
  }
}

function collect(model: PlayerInputModel, parts: Array<string>): void {
  parts.push(
    model.type,
    model.buttonLabel ?? '',
    titleText(model.title),
    model.annotation ?? '',
    String(model.optional ?? false),
  );
  if ('cards' in model) {
    parts.push(model.cards.map((card) => card.name).join(','));
  }
  const selector = model as {min?: number, max?: number};
  if (selector.min !== undefined || selector.max !== undefined) {
    parts.push(String(selector.min), String(selector.max));
  }
  if ('options' in model) {
    parts.push(String(model.options.length));
    for (const option of model.options) {
      collect(option, parts);
    }
  }
}

/**
 * Stable identity of the prompt behind a player-input model.
 *
 * It is derived from the prompt contents, so rebuilding a model for the same prompt
 * yields the same identity, while a different prompt always yields a different one.
 */
export function promptIdForModel(model: PlayerInputModel | undefined): string | undefined {
  if (model === undefined) {
    return undefined;
  }
  const parts: Array<string> = [];
  collect(model, parts);
  return parts.join('|');
}

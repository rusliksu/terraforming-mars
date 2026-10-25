export const BOARD_COLUMN_LEFT_VARIABLE = '--wrybit-board-column-left';

const owners = new Map<symbol, HTMLElement>();
let previousValue = '';
let previousPriority = '';

function update(): void {
  const column = [...owners.values()].reverse().find((element) => element.isConnected);
  if (column !== undefined) {
    document.documentElement.style.setProperty(BOARD_COLUMN_LEFT_VARIABLE, column.getBoundingClientRect().left + 'px');
  }
}

export function observeBoardColumn(column: HTMLElement): () => void {
  const style = document.documentElement.style;
  if (owners.size === 0) {
    previousValue = style.getPropertyValue(BOARD_COLUMN_LEFT_VARIABLE);
    previousPriority = style.getPropertyPriority(BOARD_COLUMN_LEFT_VARIABLE);
  }
  const owner = Symbol('wrybit-board-column');
  owners.set(owner, column);
  let alive = true;
  const refresh = () => {
    if (alive) {
      update();
    }
  };
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(refresh);
  observer?.observe(column);
  window.addEventListener('resize', refresh);
  refresh();
  return () => {
    if (!alive) {
      return;
    }
    alive = false;
    observer?.disconnect();
    window.removeEventListener('resize', refresh);
    owners.delete(owner);
    if (owners.size > 0) {
      update();
    } else if (previousValue) {
      style.setProperty(BOARD_COLUMN_LEFT_VARIABLE, previousValue, previousPriority);
    } else {
      style.removeProperty(BOARD_COLUMN_LEFT_VARIABLE);
    }
  };
}

// Digits 1 … 99 choose the selectable items (cards, option tiles, players, colonies …) of the active group.
// A group is an element marked with data-hotkey-group (the action box of OrOptions / WaitingForTabs, the columns
// of the initial selection); when several are visible
// (initial selection: corporation, preludes, cards side by side) the one with data-hotkey-group-active="true" wins.
// Items are labels with an enabled radio button or check box, in reading order.
//
// Up to ten items keep the old one-key digits (1 … 9, 0). With more than ten items numbering becomes two-digit:
// 01 … 99. For 11 … 19 items a digit 2 … 9 is still unambiguous and selects immediately; 1 is the prefix of 10 … 19
// and therefore needs 01 for the first item. From 20 items on every item uses its two-digit code.
import {PICK_DIGITS} from '@/client/hotkeys/hotkeyActions';

const GROUP_SELECTOR = '[data-hotkey-group]';
const ITEM_SELECTOR = 'label';
// Key cap with the code, appended to the item by refreshItemNumbers (the items' ::before/::after already draw the
// selection highlight and check mark)
export const ITEM_NUMBER_CLASS = 'hotkey-item-number';
export const ITEM_NAV_CLASS = 'hotkey-item-nav';
export const MAX_HOTKEY_ITEMS = 99;

export type PickResolution = {
  /** The first digit is a prefix and the second digit is still needed */
  pending?: boolean;
  /** Zero-based index of the item to click */
  index?: number;
  /** The buffer cannot be a valid item code */
  invalid?: boolean;
};

export function isVisible(element: Element): boolean {
  return element instanceof HTMLElement && element.getClientRects().length > 0 &&
    window.getComputedStyle(element).visibility !== 'hidden';
}

function containsCandidate(element: Element, candidates: ReadonlyArray<Element>): boolean {
  return candidates.some((other) => other !== element && element.contains(other));
}

export function activeHotkeyGroup(scope: Document | Element = document): Element | undefined {
  const groups = Array.from(scope.querySelectorAll(GROUP_SELECTOR)).filter(isVisible);
  const marked = groups.find((group) => group.getAttribute('data-hotkey-group-active') === 'true');
  if (marked !== undefined) {
    return marked;
  }
  // Without a marked group: the innermost one (a nested input's own group wins over the box around it)
  return groups.find((group) => !containsCandidate(group, groups)) ?? groups[0];
}

function selectableInput(label: Element): HTMLInputElement | undefined {
  const input = label.querySelector('input[type="radio"], input[type="checkbox"]');
  if (!(input instanceof HTMLInputElement) || input.disabled) {
    return undefined;
  }
  // Inputs of a nested label belong to that label
  return input.closest('label') === label ? input : undefined;
}

export function hotkeyItems(group: Element | undefined): Array<HTMLElement> {
  if (group === undefined) {
    return [];
  }
  return Array.from(group.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
    .filter((label) => selectableInput(label) !== undefined && isVisible(label))
    .slice(0, MAX_HOTKEY_ITEMS);
}

/** Code shown on an item and typed by the player. Undefined outside the item range. */
export function hotkeyItemCode(index: number, count: number): string | undefined {
  if (index < 0 || index >= count || index >= MAX_HOTKEY_ITEMS) {
    return undefined;
  }
  if (count <= 10) {
    return PICK_DIGITS[index];
  }
  if (count >= 20) {
    return String(index + 1).padStart(2, '0');
  }
  // 11 … 19 items: 1 would be the prefix of 10 … 19, so the first item shows 01.
  return index === 0 ? '01' : String(index + 1);
}

function codesFor(count: number): Array<string> {
  return Array.from({length: Math.min(count, MAX_HOTKEY_ITEMS)}, (_, index) => hotkeyItemCode(index, count) as string);
}

/**
 * Resolve the digit buffer against the item count.
 * A single digit is emitted immediately only when it is a complete, unambiguous code; otherwise it stays pending
 * until the second digit. This gives 2 → item 2 for 11 … 19 items, but 02 → item 2 from 20 items on.
 */
export function resolvePickInput(input: string, count: number): PickResolution {
  if (input.length === 0) {
    return {};
  }
  const codes = codesFor(count);
  const exact = codes.indexOf(input);
  if (count <= 10) {
    return exact >= 0 ? {index: exact} : {invalid: true};
  }
  if (input.length === 1) {
    const prefix = codes.some((code) => code.length > 1 && code.startsWith(input));
    if (exact >= 0 && !prefix) {
      return {index: exact};
    }
    return prefix ? {pending: true} : {invalid: true};
  }
  if (input.length === 2) {
    return exact >= 0 ? {index: exact} : {invalid: true};
  }
  return {invalid: true};
}

let navigationGroup: Element | undefined;
let navigationIndex = -1;

export function resetHotkeyNavigation(): void {
  for (const item of Array.from(document.querySelectorAll(`.${ITEM_NAV_CLASS}`))) {
    item.classList.remove(ITEM_NAV_CLASS);
  }
  navigationGroup = undefined;
  navigationIndex = -1;
}

/** Move the visible focus between selectable items. Returns false when there is nothing to navigate. */
export function moveHotkeyNavigation(direction: 1 | -1): boolean {
  const group = activeHotkeyGroup();
  const items = hotkeyItems(group);
  if (group === undefined || items.length < 2) {
    resetHotkeyNavigation();
    return false;
  }
  if (navigationGroup !== group) {
    resetHotkeyNavigation();
    navigationGroup = group;
    const selected = items.findIndex((item) => item.querySelector('input:checked') !== null);
    navigationIndex = selected;
  }
  if (navigationIndex < 0 || navigationIndex >= items.length) {
    navigationIndex = direction > 0 ? -1 : 0;
  }
  navigationIndex = (navigationIndex + direction + items.length) % items.length;
  for (const item of Array.from(document.querySelectorAll(`.${ITEM_NAV_CLASS}`))) {
    item.classList.remove(ITEM_NAV_CLASS);
  }
  const item = items[navigationIndex];
  item.classList.add(ITEM_NAV_CLASS);
  if (typeof item.scrollIntoView === 'function') {
    item.scrollIntoView({block: 'center', inline: 'center', behavior: 'smooth'});
  }
  return true;
}

/** Confirm the highlighted item (toggle a checkbox, choose a radio), then leave navigation mode. */
export function confirmHotkeyNavigation(): boolean {
  const group = activeHotkeyGroup();
  const items = hotkeyItems(group);
  if (navigationGroup === undefined || navigationGroup !== group || navigationIndex < 0 || navigationIndex >= items.length) {
    resetHotkeyNavigation();
    return false;
  }
  items[navigationIndex].click();
  resetHotkeyNavigation();
  return true;
}

/** Gives the items of the active group a key cap with their code and removes it from all others */
export function refreshItemNumbers(show: boolean): void {
  const items = show ? hotkeyItems(activeHotkeyGroup()) : [];
  for (const cap of Array.from(document.querySelectorAll(`.${ITEM_NUMBER_CLASS}`))) {
    if (!items.includes(cap.parentElement as HTMLElement)) {
      cap.remove();
    }
  }
  items.forEach((item, index) => {
    const number = hotkeyItemCode(index, items.length);
    if (number === undefined) {
      return;
    }
    let cap = Array.from(item.children).find((child) => child.classList.contains(ITEM_NUMBER_CLASS));
    if (cap === undefined) {
      cap = document.createElement('kbd');
      cap.className = ITEM_NUMBER_CLASS;
      cap.setAttribute('aria-hidden', 'true');
      item.appendChild(cap);
    }
    // Only touch the DOM on a real change: the MutationObserver would otherwise call this again and again
    if (cap.textContent !== number) {
      cap.textContent = number;
    }
  });
  // A changed tab/filter may remove the highlighted item.
  if (navigationGroup !== undefined) {
    const activeGroup = activeHotkeyGroup();
    const cursor = document.querySelector(`.${ITEM_NAV_CLASS}`);
    if (navigationGroup !== activeGroup || cursor === null || !items.includes(cursor as HTMLElement)) {
      resetHotkeyNavigation();
    }
  }
}

import {expect} from 'chai';
import {onHotkey, stopHoldScroll} from '@/client/hotkeys/hotkeyDispatcher';
import {labelConfirmHotkey, tabConfirmHotkey} from '@/client/hotkeys/confirmHotkeys';
import {ITEM_NAV_CLASS, resetHotkeyNavigation} from '@/client/hotkeys/hotkeyItems';

// jsdom lays nothing out: every element counts as visible for the dispatcher
const originalRects = HTMLElement.prototype.getClientRects;

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {key, cancelable: true});
  document.body.dispatchEvent(event);
  onHotkey(event);
  return event;
}

function button(hotkey: string): {element: HTMLButtonElement, clicks: () => number} {
  const element = document.createElement('button');
  element.setAttribute('data-hotkey', hotkey);
  let count = 0;
  element.addEventListener('click', () => count++);
  document.body.appendChild(element);
  return {element, clicks: () => count};
}

describe('hotkeyDispatcher', () => {
  beforeEach(() => {
    HTMLElement.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
  });

  afterEach(() => {
    // Clear the private two-digit buffer before the next test.
    press('Escape');
    resetHotkeyNavigation();
    HTMLElement.prototype.getClientRects = originalRects;
    stopHoldScroll();
    document.body.innerHTML = '';
  });

  function groupWithItems(count: number): HTMLElement {
    const group = document.createElement('div');
    group.setAttribute('data-hotkey-group', '');
    for (let i = 0; i < count; i++) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      label.appendChild(input);
      group.appendChild(label);
    }
    document.body.appendChild(group);
    return group;
  }

  it('sends binding steps with Enter and routine steps with Space', () => {
    const binding = button('confirm');
    const routine = button('proceed');
    expect(press('Enter').defaultPrevented).is.true;
    expect(binding.clicks()).to.equal(1);
    press(' ');
    expect(routine.clicks()).to.equal(1);
    expect(binding.clicks()).to.equal(1);
  });

  it('only shakes the button on the wrong key', () => {
    const binding = button('confirm');
    expect(press(' ').defaultPrevented).is.true;
    expect(binding.clicks()).to.equal(0);
    expect(binding.element.classList.contains('hotkey-wrong-key')).is.true;
  });

  it('scrolls the main box of the active group with arrow up / down', () => {
    const group = document.createElement('div');
    group.setAttribute('data-hotkey-group', '');
    const list = document.createElement('div');
    list.style.overflowY = 'auto';
    Object.defineProperty(list, 'scrollHeight', {value: 1000});
    Object.defineProperty(list, 'clientHeight', {value: 300});
    const steps: Array<number> = [];
    list.scrollBy = ((options: {top?: number}) => steps.push(options.top ?? 0)) as typeof list.scrollBy;
    group.appendChild(list);
    document.body.appendChild(group);
    expect(press('ArrowDown').defaultPrevented).is.true;
    press('ArrowUp');
    expect(steps).has.length(2);
    expect(steps[0]).to.be.greaterThan(0);
    expect(steps[1]).to.be.lessThan(0);
  });

  it('selects up to ten items with one digit', () => {
    const group = groupWithItems(10);
    const labels = Array.from(group.querySelectorAll('label'));
    let selected = 0;
    labels[1].addEventListener('click', () => selected++);
    expect(press('2').defaultPrevented).is.true;
    expect(selected).to.be.greaterThan(0);
  });

  it('keeps 2 immediate for 11 … 19 items but waits for 1', () => {
    const group = groupWithItems(12);
    const labels = Array.from(group.querySelectorAll('label'));
    let two = 0;
    let one = 0;
    labels[1].addEventListener('click', () => two++);
    labels[0].addEventListener('click', () => one++);
    expect(press('2').defaultPrevented).is.true;
    expect(two).to.be.greaterThan(0);
    expect(press('1').defaultPrevented).is.true;
    expect(one).to.equal(0);
    expect(press('0').defaultPrevented).is.true;
    expect(one).to.equal(0);
    expect(press('0').defaultPrevented).is.true;
    expect(press('1').defaultPrevented).is.true;
    expect(one).to.be.greaterThan(0);
  });

  it('requires leading zeroes from twenty items on', () => {
    const group = groupWithItems(20);
    const labels = Array.from(group.querySelectorAll('label'));
    let two = 0;
    let twenty = 0;
    labels[1].addEventListener('click', () => two++);
    labels[19].addEventListener('click', () => twenty++);
    expect(press('2').defaultPrevented).is.true;
    expect(two).to.equal(0);
    expect(press('0').defaultPrevented).is.true;
    expect(twenty).to.be.greaterThan(0);
    expect(press('0').defaultPrevented).is.true;
    expect(press('2').defaultPrevented).is.true;
    expect(two).to.be.greaterThan(0);
  });

  it('moves the card cursor with arrows and activates it with Enter', () => {
    const group = groupWithItems(5);
    const labels = Array.from(group.querySelectorAll('label'));
    let activated = 0;
    labels[0].addEventListener('click', () => activated++);
    expect(press('ArrowRight').defaultPrevented).is.true;
    expect(labels[0].classList.contains(ITEM_NAV_CLASS)).is.true;
    expect(press('Enter').defaultPrevented).is.true;
    expect(activated).to.be.greaterThan(0);
    expect(labels[0].classList.contains(ITEM_NAV_CLASS)).is.false;
  });

  it('knows which steps are binding', () => {
    expect(tabConfirmHotkey('tab-pass')).to.equal('confirm');
    expect(tabConfirmHotkey('tab-actions')).to.equal('proceed');
    expect(labelConfirmHotkey('Discard')).to.equal('confirm');
    expect(labelConfirmHotkey('Add resource')).to.equal('proceed');
  });
});

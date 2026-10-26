import {expect} from 'chai';
import {
  ITEM_NAV_CLASS,
  ITEM_NUMBER_CLASS,
  confirmHotkeyNavigation,
  hotkeyItemCode,
  moveHotkeyNavigation,
  refreshItemNumbers,
  resetHotkeyNavigation,
  resolvePickInput,
} from '@/client/hotkeys/hotkeyItems';

const originalRects = HTMLElement.prototype.getClientRects;

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

describe('hotkeyItems', () => {
  beforeEach(() => {
    HTMLElement.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
  });

  afterEach(() => {
    resetHotkeyNavigation();
    document.body.innerHTML = '';
    HTMLElement.prototype.getClientRects = originalRects;
  });

  it('uses one digit up to ten items and zero for the tenth', () => {
    expect(hotkeyItemCode(0, 10)).to.equal('1');
    expect(hotkeyItemCode(8, 10)).to.equal('9');
    expect(hotkeyItemCode(9, 10)).to.equal('0');
  });

  it('uses a two-digit code from twenty items on', () => {
    expect(hotkeyItemCode(0, 20)).to.equal('01');
    expect(hotkeyItemCode(1, 20)).to.equal('02');
    expect(hotkeyItemCode(19, 20)).to.equal('20');
    expect(hotkeyItemCode(49, 50)).to.equal('50');
  });

  it('keeps 2 … 9 one-digit for 11 … 19 items but prefixes the ambiguous 1', () => {
    expect(hotkeyItemCode(0, 19)).to.equal('01');
    expect(hotkeyItemCode(1, 19)).to.equal('2');
    expect(hotkeyItemCode(8, 19)).to.equal('9');
    expect(hotkeyItemCode(9, 19)).to.equal('10');
    expect(hotkeyItemCode(18, 19)).to.equal('19');
  });

  it('resolves the two-digit buffer by the visible item count', () => {
    expect(resolvePickInput('2', 10)).deep.equal({index: 1});
    expect(resolvePickInput('0', 10)).deep.equal({index: 9});
    expect(resolvePickInput('2', 12)).deep.equal({index: 1});
    expect(resolvePickInput('1', 12)).deep.equal({pending: true});
    expect(resolvePickInput('01', 12)).deep.equal({index: 0});
    expect(resolvePickInput('12', 12)).deep.equal({index: 11});
    expect(resolvePickInput('02', 12)).deep.equal({invalid: true});
    expect(resolvePickInput('2', 20)).deep.equal({pending: true});
    expect(resolvePickInput('02', 20)).deep.equal({index: 1});
    expect(resolvePickInput('20', 20)).deep.equal({index: 19});
    expect(resolvePickInput('50', 50)).deep.equal({index: 49});
    expect(resolvePickInput('51', 50)).deep.equal({invalid: true});
  });

  it('shows the code on every item of a large group', () => {
    groupWithItems(50);
    refreshItemNumbers(true);
    const caps = Array.from(document.querySelectorAll<HTMLElement>(`.${ITEM_NUMBER_CLASS}`));
    expect(caps).has.length(50);
    expect(caps[0].textContent).to.equal('01');
    expect(caps[1].textContent).to.equal('02');
    expect(caps[49].textContent).to.equal('50');
  });

  it('moves a visible cursor with the arrows and activates it with Enter', () => {
    const group = groupWithItems(5);
    const labels = Array.from(group.querySelectorAll('label'));
    let clicks = 0;
    labels[1].addEventListener('click', () => clicks++);
    expect(moveHotkeyNavigation(1)).is.true;
    expect(labels[0].classList.contains(ITEM_NAV_CLASS)).is.true;
    expect(moveHotkeyNavigation(1)).is.true;
    expect(labels[0].classList.contains(ITEM_NAV_CLASS)).is.false;
    expect(labels[1].classList.contains(ITEM_NAV_CLASS)).is.true;
    expect(confirmHotkeyNavigation()).is.true;
    expect(clicks).to.be.greaterThan(0);
    expect(labels[1].classList.contains(ITEM_NAV_CLASS)).is.false;
  });
});

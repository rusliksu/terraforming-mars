import {expect} from 'chai';
import {scrollToSpace} from '@/client/utils/boardScroll';

describe('scrollToSpace', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls to the exact Mars space, not just the board container', () => {
    document.body.innerHTML = `
      <div id="shortkey-board">
        <div data_space_id="05"></div>
      </div>`;
    const space = document.querySelector('[data_space_id="05"]') as HTMLElement;
    let scrolledOn: EventTarget | undefined;
    space.scrollIntoView = function() {
      scrolledOn = this;
    };
    document.getElementById('shortkey-board')!.scrollIntoView = () => {
      throw new Error('should not scroll the whole board when the exact space is found');
    };

    const result = scrollToSpace('05');

    expect(scrolledOn).to.eq(space);
    expect(result).to.eq(document.getElementById('shortkey-board'));
  });

  it('scrolls to the exact Moon space', () => {
    document.body.innerHTML = `
      <div id="shortkey-moonBoard">
        <div data_space_id="m05"></div>
      </div>`;
    const space = document.querySelector('[data_space_id="m05"]') as HTMLElement;
    let scrolled = false;
    space.scrollIntoView = () => {
      scrolled = true;
    };

    scrollToSpace('m05');

    expect(scrolled).is.true;
  });

  it('falls back to the whole board when the exact space is not in the DOM', () => {
    document.body.innerHTML = `<div id="shortkey-board"></div>`;
    const board = document.getElementById('shortkey-board')!;
    let scrolled = false;
    board.scrollIntoView = () => {
      scrolled = true;
    };

    const result = scrollToSpace('05');

    expect(scrolled).is.true;
    expect(result).to.eq(board);
  });

  it('returns null when the relevant board is not on this screen', () => {
    document.body.innerHTML = '';
    expect(scrollToSpace('m05')).is.null;
  });
});

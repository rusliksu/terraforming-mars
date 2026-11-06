import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {parse} from 'postcss';
import {expect} from 'chai';

const less: {render: (text: string, options: {filename: string, rewriteUrls: 'all'}) => Promise<{css: string}>} = createRequire(resolve('package.json'))('less');

describe('Wrybit compiled visual styles', () => {
  it('styles the rendered state classes inside the optional root and retains the outer mobile context', async () => {
    const filename = resolve('src/styles/wrybit/visuals.less');
    const {css} = await less.render(readFileSync(filename, 'utf8'), {filename, rewriteUrls: 'all'});
    const stylesheet = parse(css);
    function declaration(selector: string, property: string): string | undefined {
      let value: string | undefined;
      // Grouped selectors (one declaration block for several selectors) must match too
      stylesheet.walkRules((rule) => {
        if (rule.selector.split(',').some((part) => part.trim() === selector)) {
          rule.walkDecls(property, (decl) => {
            value = decl.value;
          });
        }
      });
      return value;
    }
    expect(declaration('.wrybit-ui .track-bonus-chip--done', 'opacity')).eq('0.5');
    expect(declaration('.wrybit-ui .track-bonus-chip--everyone', 'border-style')).eq('dashed');
    expect(declaration('.wrybit-ui .track-bonus-pin--up', 'flex-direction')).eq('column');
    expect(declaration('.wrybit-ui .board-track-row__cell--at', 'background')).eq('#2fb0a8');
    expect(declaration('html.tm-mobile .wrybit-ui .delta-board__next', 'display')).eq('none');
    expect(declaration('html:not(.tm-mobile) .wrybit-ui .delta-board', 'height')).eq('100%');
    expect(declaration('.wrybit-ui .player-cube--top', '--wrybit-lie')).eq('1');
    expect(declaration('.wrybit-ui .board-outer-spaces--corners', 'pointer-events')).eq('none');
    expect(declaration('.wrybit-ui .board-outer-spaces--corners .board-outer-group', 'pointer-events')).eq('auto');
    // Light reserved personas keep their classic dark text inside the player-table row
    expect(declaration('.wrybit-ui .players-table-row--pearl .players-table-name', 'color')).eq('#102027');
    expect(declaration('.wrybit-ui .players-table-row--pearl .players-table-corporation', 'color')).eq('#102027');
    expect(declaration('.wrybit-ui .players-table-row--gold .players-table-counter', 'color')).eq('#000000');
    expect(declaration('.wrybit-ui .players-table-row--saturn .players-table-name', 'color')).eq('#2b1d08');
    expect(declaration('.wrybit-ui .players-table-row--saturnrings .players-table-name', 'color')).eq('#241a0b');
    // The corporation line stays lighter than the name, and the dimmer persona surfaces fade it less
    expect(declaration('.wrybit-ui .players-table-row--pearl .players-table-corporation', 'opacity')).eq('0.78');
    expect(declaration('.wrybit-ui .players-table-row--gold .players-table-corporation', 'opacity')).eq('0.88');
    expect(declaration('.wrybit-ui .players-table-row--vanger .players-table-corporation', 'opacity')).eq('0.88');
    expect(declaration('.wrybit-ui .players-table-row--saturn .players-table-corporation', 'opacity')).eq('1');
    expect(declaration('.wrybit-ui .players-table-row--saturnrings .players-table-corporation', 'opacity')).eq('1');
    // Idle action block (not this player's turn) shrinks so the cards panel fills the column
    const idleActions = '.wrybit-ui .player-home--fixed:not(.player-home--acting) .player-home-columns__main > .player_home_block--actions';
    expect(declaration(idleActions, 'flex')).eq('0 1 auto');
    expect(declaration(idleActions, 'min-height')).eq('0');
    // Tag cells stack the icon above the count; unplayed tags recede and the event group has a divider
    expect(declaration('.wrybit-ui .players-table-cell--tag .tag-count', 'zoom')).eq('1');
    expect(declaration('.wrybit-ui .players-table-cell--tag-empty .tag-count', 'opacity')).eq('0.45');
    expect(declaration('.wrybit-ui .players-table-tag-separator::after', 'width')).eq('1px');
    expect(declaration('.wrybit-ui .players-table-counter', 'font-size')).eq('23px');
    // The header row is gone: the controls sit above the table and the score cells stack their icons
    expect(declaration('.wrybit-ui .players-table-controls', 'display')).eq('flex');
    expect(declaration('.wrybit-ui .players-table-cell--score .tag-count', 'zoom')).eq('1');
    stylesheet.walkDecls((decl) => {
      for (const match of decl.value.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
        expect(match[1].replace(/^\.\//, '')).matches(/^assets\//);
      }
    });
    stylesheet.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') {
        expect(rule.parent.params).matches(/^wrybit-/);
      } else {
        expect(rule.selector).contains('.wrybit-ui');
        expect(rule.selector).not.contains('.wrybit-ui html');
      }
    });
  });
});

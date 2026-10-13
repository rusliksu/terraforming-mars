import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {parse} from 'postcss';
import {expect} from 'chai';

const less: {render: (text: string, options: {filename: string}) => Promise<{css: string}>} = createRequire(resolve('package.json'))('less');

describe('Wrybit compiled visual styles', () => {
  it('styles the rendered state classes inside the optional root and retains the outer mobile context', async () => {
    const filename = resolve('src/styles/wrybit/visuals.less');
    const {css} = await less.render(readFileSync(filename, 'utf8'), {filename});
    const stylesheet = parse(css);
    function declaration(selector: string, property: string): string | undefined {
      let value: string | undefined;
      stylesheet.walkRules(selector, (rule) => rule.walkDecls(property, (decl) => {
        value = decl.value;
      }));
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

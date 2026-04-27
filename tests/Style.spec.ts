import {expect} from 'chai';
import {readFileSync} from 'fs';

describe('Styles', () => {
  it('uses a monotone persona overview background', () => {
    const styles = readFileSync('src/styles/mixins.less', 'utf8');
    const mixin = styles.match(/\.player_persona_bg_translucent\(@accent\) \{[\s\S]*?\n\}/)?.[0];

    expect(mixin).to.not.be.undefined;
    expect(mixin).to.include('background-color:');
    expect(mixin).not.to.include('linear-gradient');
    expect(mixin).not.to.include('radial-gradient');
  });
});

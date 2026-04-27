import {expect} from 'chai';
import {readFileSync} from 'fs';

function read(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

function cssBlock(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[\\s\\S]*?\\n\\}`));
  return match?.[0] ?? '';
}

describe('Styles', () => {
  it('uses a cool Mars red treatment for the GydRo persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');

    expect(variables).to.contain('@player_hydro: rgb(179, 38, 58);');
    expect(common).to.contain('.player_bg_color_hydro');
    expect(common).to.contain('#ffe5e8');
    expect(common).not.to.contain('linear-gradient(90deg, @player_hydro, #254ec6)');
    expect(board).to.contain('.board-cube--hydro');
    expect(board).to.contain('content: "♂"');
    expect(playerHome).to.contain('&.colonies-fleet-hydro');
    expect(turmoil).to.contain('&.hydro');
    expect(playerSymbol).to.contain("hydro: '♂'");
  });

  it('uses a reserved calm blue treatment for the Antistress persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');

    expect(variables).to.contain('@player_antistress: rgb(29, 58, 116);');
    expect(common).to.contain('.player_bg_color_antistress');
    expect(board).to.contain('.board-cube--antistress');
    expect(board).to.contain('content: "✚"');
    expect(playerHome).to.contain('&.colonies-fleet-antistress');
    expect(turmoil).to.contain('&.antistress');
    expect(playerSymbol).to.contain("antistress: '✚'");
  });

  it('uses a reserved hydrangea blue treatment for the GambitGirl persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');

    expect(variables).to.contain('@player_gambit: rgb(111, 164, 205);');
    expect(common).to.contain('.player_bg_color_gambit');
    expect(board).to.contain('.board-cube--gambit');
    expect(board).to.contain('content: "♞"');
    expect(playerHome).to.contain('&.colonies-fleet-gambit');
    expect(turmoil).to.contain('&.gambit');
    expect(playerSymbol).to.contain("gambit: '♞'");
  });

  it('keeps custom cubes sprite-based outside Mars board spaces', () => {
    const board = read('src/styles/board.less');

    expect(board).to.contain('.board-cube--gold {\n\tbackground: url(./assets/board_icons.png) -72px -91px no-repeat;');
    expect(board).to.contain('.board-cube--emerald {\n\tbackground: url(./assets/board_icons.png) -1px -91px no-repeat;');
    expect(board).to.contain('.board-cube--ginger {\n\tbackground: url(./assets/board_icons.png) -1px -117px no-repeat;');
    expect(board).to.contain('.board-cube--hydro {\n\tbackground: url(./assets/board_icons.png) -24px -91px no-repeat;');
    expect(board).to.contain('.board-cube--antistress {\n\tbackground: url(./assets/board_icons.png) -94px -91px no-repeat;');
    expect(board).to.contain('.board-cube--gambit {\n\tbackground: url(./assets/board_icons.png) -94px -91px no-repeat;');
    for (const selector of ['.board-cube--gold', '.board-cube--emerald', '.board-cube--ginger', '.board-cube--hydro', '.board-cube--antistress', '.board-cube--gambit']) {
      expect(cssBlock(board, selector)).not.to.contain('linear-gradient');
    }
  });

  it('applies persona cube rendering to Mars and Moon board spaces', () => {
    const boardSpace = read('src/client/components/BoardSpace.vue');
    const moonSpace = read('src/client/components/moon/MoonSpace.vue');

    expect(boardSpace).to.contain('isReservedPlayerColor(this.space.color)');
    expect(boardSpace).to.contain("css += ' board-cube--persona';");
    expect(moonSpace).to.contain('isReservedPlayerColor(this.space.color)');
    expect(moonSpace).to.contain('isReservedPlayerColor(this.space.coOwner)');
  });

  it('does not apply board-space offsets to milestone and award owner cubes', () => {
    const playerHome = read('src/styles/player_home.less');
    const milestone = read('src/client/components/Milestone.vue');
    const milestones = read('src/client/components/Milestones.vue');
    const award = read('src/client/components/Award.vue');
    const awards = read('src/client/components/Awards.vue');
    const colonySpace = read('src/client/components/colonies/ColonySpace.vue');

    expect(playerHome).to.contain('.ma-player {\n            margin: 25px 0 0 70px;');
    expect(playerHome).to.contain('.board-cube {\n                margin: 0;');
    for (const component of [milestone, milestones, award, awards, colonySpace]) {
      expect(component).not.to.contain('isReservedPlayerColor(');
      expect(component).not.to.contain("' overlay'");
    }
  });

  it('uses gradient-masked custom colony fleets', () => {
    const playerHome = read('src/styles/player_home.less');

    expect(playerHome).to.contain('.colonies-fleet-gradient(@x, @y, @gradient, @glow)');
    expect(playerHome).to.contain('background: url(./assets/colony_ships.png) @x @y no-repeat;');
    expect(playerHome).to.contain('-webkit-mask-image: url(./assets/colony_ships.png);');
    expect(playerHome).to.contain('mask-image: url(./assets/colony_ships.png);');
    expect(playerHome).to.contain('opacity: 0.78;');
    expect(playerHome).to.contain('mix-blend-mode: color;');
    expect(playerHome).not.to.contain('.colonies-fleet-badge');
    expect(playerHome).not.to.contain('content: @glyph');
    expect(playerHome).to.contain('&.colonies-fleet-gold');
    expect(playerHome).to.contain('linear-gradient(135deg, #fff6a8 0%, #f6d35a 30%, #d4af37 55%, #815400 78%, #fff0a0 100%)');
    expect(playerHome).to.contain('linear-gradient(135deg, #ff9da5 0%, #d94c5b 33%, @player_hydro 62%, #5e0714 100%)');
    expect(playerHome).to.contain('linear-gradient(135deg, #6f94d4 0%, #315a9d 36%, @player_antistress 66%, #071b3d 100%)');
    expect(playerHome).to.contain('linear-gradient(135deg, #e3f2ff 0%, #b7d5ec 34%, @player_gambit 64%, #345f8c 100%)');
  });

  it('uses tinted custom Turmoil delegate tokens', () => {
    const turmoil = read('src/styles/turmoil.less');

    expect(turmoil).to.contain('.player-token-persona(@x, @y, @gradient, @fg)');
    expect(turmoil).to.contain('-webkit-mask-image: url(./assets/misc/delegate.png);');
    expect(turmoil).to.contain('mask-size: 24px 30px;');
    expect(turmoil).to.contain('opacity: 0.94;');
    expect(turmoil).not.to.contain('mix-blend-mode: screen;');
    expect(turmoil).not.to.contain('font-family: "Segoe Print", Prototype;');
    expect(turmoil).not.to.contain('font-family: "Segoe Script", "Lucida Handwriting", Prototype;');
    expect(turmoil).not.to.contain('font-style: italic;');
    expect(turmoil).to.contain('&.gold');
    expect(turmoil).to.contain('linear-gradient(135deg, #fff4a6 0%, #f1cd45 36%, #b98708 68%, #fff0a0 100%)');
    expect(turmoil).to.contain('linear-gradient(135deg, #ff9da5 0%, #d94c5b 38%, @player_hydro 68%, #5e0714 100%)');
    expect(turmoil).to.contain('linear-gradient(135deg, #6f94d4 0%, #315a9d 38%, @player_antistress 68%, #071b3d 100%)');
    expect(turmoil).to.contain('linear-gradient(135deg, #e3f2ff 0%, #b7d5ec 38%, @player_gambit 68%, #345f8c 100%)');
  });

  it('keeps GenuineGold text dark on gold UI surfaces', () => {
    const common = read('src/styles/common.less');
    const createGame = read('src/styles/create_game_form.less');
    const turmoil = read('src/styles/turmoil.less');

    expect(common).to.contain('.player_bg_color_gold {\n    background-color: @player_gold;\n    color: #1b1400;');
    expect(common).to.contain('.player_translucent_bg_color_gold .player-name {\n    color: #1b1400;');
    expect(createGame).to.contain('.create-game-player-field-theme(#1b1400, #fff2a6);');
    expect(createGame).to.contain('background: linear-gradient(90deg, #f7d95b, @player_gold);');
    expect(turmoil).to.contain('#1b1400');
  });

  it('gives reserved personas distinctive typography', () => {
    const common = read('src/styles/common.less');
    const createGame = read('src/styles/create_game_form.less');

    expect(common).to.contain('font-family: Georgia, "Times New Roman", serif;');
    expect(common).to.contain('font-family: "Segoe Print", "Comic Sans MS", Verdana, Ubuntu, Sans;');
    expect(common).to.contain('font-family: Bahnschrift, "Segoe UI Semibold", "Segoe UI", Ubuntu, Sans;');
    expect(common).to.contain('font-family: Candara, "Trebuchet MS", Ubuntu, Sans;');
    expect(common).to.contain('font-family: "Segoe Script", "Lucida Handwriting", Candara, Ubuntu, Sans;');
    expect(common).to.contain('letter-spacing: 0.45px;');
    expect(createGame).to.contain('.player_translucent_bg_color_ginger');
    expect(createGame).to.contain('font-family: "Segoe Print", "Comic Sans MS", Verdana, Ubuntu, Sans;');
    expect(createGame).to.contain('.player_translucent_bg_color_gambit');
  });

  it('uses a monotone translucent persona overview background', () => {
    const mixins = read('src/styles/mixins.less');

    expect(mixins).to.contain('.player_persona_bg_translucent(@accent)');
    expect(mixins).to.contain('background-color: fade(@base, 82%)');
    expect(mixins).to.contain('.player_hydro_bg_translucent()');
    expect(mixins).to.contain('.player_antistress_bg_translucent()');
    expect(mixins).to.contain('.player_gambit_bg_translucent()');
  });

  it('keeps player log labels on one line', () => {
    const log = read('src/styles/log.less');

    expect(log).to.contain('.log-player');
    expect(log).to.contain('display: inline-block;');
    expect(log).to.contain('white-space: nowrap;');
  });
});

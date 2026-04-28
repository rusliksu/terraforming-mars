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

    expect(variables).to.contain('@player_hydro: rgb(190, 31, 72);');
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

  it('uses a reserved turquoise treatment for the Pasha persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');

    expect(variables).to.contain('@player_turquoise: rgb(0, 174, 181);');
    expect(common).to.contain('.player_bg_color_turquoise');
    expect(board).to.contain('.board-cube--turquoise');
    expect(board).to.contain('content: "◇"');
    expect(playerHome).to.contain('&.colonies-fleet-turquoise');
    expect(turmoil).to.contain('&.turquoise');
    expect(playerSymbol).to.contain("turquoise: '◇'");
  });

  it('keeps custom cubes sprite-based outside Mars board spaces', () => {
    const variables = read('src/styles/variables.less');
    const board = read('src/styles/board.less');

    expect(variables).to.contain('@player_gold_sprite_filter: sepia(0.45) saturate(1.65) hue-rotate(346deg) brightness(0.90) contrast(1.12);');
    expect(variables).to.contain('@player_emerald_sprite_filter: hue-rotate(18deg) saturate(1.70) brightness(0.72) contrast(1.12);');
    expect(variables).to.contain('@player_antistress_sprite_filter: saturate(1.35) brightness(0.58) contrast(1.22);');
    expect(variables).to.contain('@player_gambit_sprite_filter: hue-rotate(315deg) saturate(0.55) brightness(1.22) contrast(1.03);');
    expect(variables).to.contain('@player_turquoise_sprite_filter: hue-rotate(55deg) saturate(1.35) brightness(1.04) contrast(1.05);');
    expect(board).to.contain('.board-cube--gold {\n\tbackground: url(./assets/board_icons.png) -72px -91px no-repeat;');
    expect(cssBlock(board, '.board-cube--gold')).to.contain('@player_gold_sprite_filter');
    expect(board).to.contain('.board-cube--emerald {\n\tbackground: url(./assets/board_icons.png) -1px -91px no-repeat;');
    expect(cssBlock(board, '.board-cube--emerald')).to.contain('@player_emerald_sprite_filter');
    expect(board).to.contain('.board-cube--ginger {\n\tbackground: url(./assets/board_icons.png) -1px -117px no-repeat;');
    expect(board).to.contain('.board-cube--hydro {\n\tbackground: url(./assets/board_icons.png) -24px -117px no-repeat;');
    expect(board).to.contain('.board-cube--antistress {\n\tbackground: url(./assets/board_icons.png) -94px -91px no-repeat;');
    expect(board).to.contain('.board-cube--gambit {\n\tbackground: url(./assets/board_icons.png) -118px -91px no-repeat;');
    expect(board).to.contain('.board-cube--turquoise {\n\tbackground: url(./assets/board_icons.png) -1px -91px no-repeat;');
    for (const selector of ['.board-cube--gold', '.board-cube--emerald', '.board-cube--ginger', '.board-cube--hydro', '.board-cube--antistress', '.board-cube--gambit', '.board-cube--turquoise']) {
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

  it('uses sprite-based custom colony fleets without overlay glow layers', () => {
    const playerHome = read('src/styles/player_home.less');

    expect(playerHome).not.to.contain('.colonies-fleet-gradient');
    expect(playerHome).not.to.contain('-webkit-mask-image: url(./assets/colony_ships.png);');
    expect(playerHome).not.to.contain('mask-image: url(./assets/colony_ships.png);');
    expect(playerHome).not.to.contain('mix-blend-mode');
    expect(playerHome).not.to.contain('radial-gradient(ellipse');
    expect(playerHome).not.to.contain('.colonies-fleet-badge');
    expect(playerHome).not.to.contain('content: @glyph');
    expect(playerHome).to.contain('&.colonies-fleet-gold');
    expect(cssBlock(playerHome, '&.colonies-fleet-gold')).to.contain('background-position: -70px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-gold')).to.contain('@player_gold_sprite_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-emerald')).to.contain('@player_emerald_sprite_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-hydro')).to.contain('background-position: -490px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-antistress')).to.contain('background-position: -272px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-gambit')).to.contain('background-position: -342px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-turquoise')).to.contain('background-position: -140px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-turquoise')).to.contain('@player_turquoise_sprite_filter');
  });

  it('uses sprite-based Turmoil delegate tokens with unfiltered white numbers', () => {
    const turmoil = read('src/styles/turmoil.less');

    expect(turmoil).not.to.contain('.player-token-persona(');
    expect(turmoil).not.to.contain('-webkit-mask-image: url(./assets/misc/delegate.png);');
    expect(turmoil).not.to.contain('mask-image: url(./assets/misc/delegate.png);');
    expect(turmoil).not.to.contain('mix-blend-mode');
    expect(turmoil).not.to.contain('font-family: "Segoe Print", Prototype;');
    expect(turmoil).not.to.contain('font-family: "Segoe Script", "Lucida Handwriting", Prototype;');
    expect(turmoil).not.to.contain('font-style: italic;');
    expect(turmoil).to.contain('.player-token-sprite(@x, @y, @filter)');
    expect(turmoil).to.contain('filter: @filter;');
    expect(turmoil).to.contain('color: #fff;');
    expect(turmoil).to.contain('width: 50px;');
    expect(turmoil).to.contain('height: 59px;');
    expect(turmoil).to.contain('.player-token__number');
    expect(turmoil).to.contain('z-index: 1;');
    expect(turmoil).to.contain('z-index: 0;');
    expect(turmoil).to.contain('&.gold');
    expect(cssBlock(turmoil, '&.gold')).to.contain('.player-token-sprite(-644px, -35px, @player_gold_sprite_filter);');
    expect(cssBlock(turmoil, '&.emerald')).to.contain('.player-token-sprite(-865px, -35px, @player_emerald_sprite_filter);');
    expect(cssBlock(turmoil, '&.ginger')).to.contain('.player-token-sprite(-644px, -105px, @player_ginger_sprite_filter);');
    expect(cssBlock(turmoil, '&.hydro')).to.contain('.player-token-sprite(-699px, -105px, @player_hydro_sprite_filter);');
    expect(cssBlock(turmoil, '&.antistress')).to.contain('.player-token-sprite(-809px, -35px, @player_antistress_sprite_filter);');
    expect(cssBlock(turmoil, '&.gambit')).to.contain('.player-token-sprite(-973px, -35px, @player_gambit_sprite_filter);');
    expect(cssBlock(turmoil, '&.turquoise')).to.contain('.player-token-sprite(-865px, -35px, @player_turquoise_sprite_filter);');
  });

  it('keeps GenuineGold text dark on gold UI surfaces', () => {
    const common = read('src/styles/common.less');
    const createGame = read('src/styles/create_game_form.less');

    expect(common).to.contain('.player_bg_color_gold {\n    background-color: @player_gold;\n    color: #1b1400;');
    expect(common).to.contain('.player_translucent_bg_color_gold .player-name {\n    color: #1b1400;');
    expect(createGame).to.contain('.create-game-player-field-theme(#1b1400, #fff2a6);');
    expect(createGame).not.to.contain('background: linear-gradient(90deg, #f7d95b, @player_gold);');
  });

  it('does not use distinctive typography for reserved personas', () => {
    const common = read('src/styles/common.less');
    const createGame = read('src/styles/create_game_form.less');

    expect(common).not.to.contain('font-family: Georgia, "Times New Roman", serif;');
    expect(common).not.to.contain('font-family: "Segoe Print", "Comic Sans MS", Verdana, Ubuntu, Sans;');
    expect(common).not.to.contain('font-family: Bahnschrift, "Segoe UI Semibold", "Segoe UI", Ubuntu, Sans;');
    expect(common).not.to.contain('font-family: Candara, "Trebuchet MS", Ubuntu, Sans;');
    expect(common).not.to.contain('font-family: "Segoe Script", "Lucida Handwriting", Candara, Ubuntu, Sans;');
    expect(common).not.to.contain('letter-spacing: 0.45px;');
    expect(createGame).to.contain('.player_translucent_bg_color_ginger');
    expect(createGame).not.to.contain('font-family: "Segoe Print", "Comic Sans MS", Verdana, Ubuntu, Sans;');
    expect(createGame).not.to.contain('font-style: italic;');
    expect(createGame).not.to.contain('letter-spacing: 0.45px;');
    expect(createGame).to.contain('.player_translucent_bg_color_gambit');
  });

  it('uses solid persona backgrounds and contrast-safe milestone/award score text', () => {
    const common = read('src/styles/common.less');
    const playerHome = read('src/styles/player_home.less');

    for (const selector of ['.player_bg_color_emerald', '.player_bg_color_ginger', '.player_bg_color_hydro', '.player_bg_color_antistress', '.player_bg_color_gambit', '.player_bg_color_turquoise']) {
      const block = cssBlock(common, selector);
      expect(block).to.contain('background-color:');
      expect(block).not.to.contain('linear-gradient');
    }
    expect(playerHome).to.contain('.ma-score.player_bg_color_hydro');
    expect(playerHome).to.contain('.ma-score.player_bg_color_antistress');
    expect(playerHome).to.contain('color: #fff;');
    expect(playerHome).to.contain('.ma-score.player_bg_color_gold');
    expect(playerHome).to.contain('.ma-score.player_bg_color_emerald');
    expect(playerHome).to.contain('color: #000;');
  });

  it('uses a monotone translucent persona overview background', () => {
    const mixins = read('src/styles/mixins.less');

    expect(mixins).to.contain('.player_persona_bg_translucent(@accent)');
    expect(mixins).to.contain('background-color: fade(@base, 82%)');
    expect(mixins).to.contain('.player_hydro_bg_translucent()');
    expect(mixins).to.contain('.player_antistress_bg_translucent()');
    expect(mixins).to.contain('.player_gambit_bg_translucent()');
    expect(mixins).to.contain('.player_turquoise_bg_translucent()');
  });

  it('keeps the game-home player link controls responsive', () => {
    const gameHome = read('src/styles/game_home.less');

    expect(gameHome).to.contain('@media (max-width: 700px)');
    expect(gameHome).to.contain('grid-template-areas:\n          "order color name copy"\n          ". . bot copied";');
    expect(gameHome).to.contain('.bot-toggle {\n      grid-area: bot;');
    expect(gameHome).to.contain('.game-home-copy {\n      grid-area: copy;');
    expect(gameHome).to.contain('.topmost-game-home');
    expect(gameHome).to.contain('position: static;');
    expect(gameHome).to.contain('overflow-x: hidden;');
  });

  it('keeps player log labels on one line', () => {
    const log = read('src/styles/log.less');

    expect(log).to.contain('.log-player');
    expect(log).to.contain('display: inline-block;');
    expect(log).to.contain('white-space: nowrap;');
  });

  it('uses the same reserved persona color-only treatment on the ELO page', () => {
    const elo = read('elo/index.html');

    for (const className of [
      'player-persona-gold',
      'player-persona-emerald',
      'player-persona-ginger',
      'player-persona-hydro',
      'player-persona-antistress',
      'player-persona-gambit',
      'player-persona-turquoise',
    ]) {
      expect(elo).to.contain(className);
    }

    expect(elo).to.contain('"антистресс": "player-persona-antistress"');
    expect(elo).to.contain('"gambitgirl": "player-persona-gambit"');
    expect(elo).to.contain('"паша": "player-persona-turquoise"');
    expect(elo).to.contain('"pavel": "player-persona-turquoise"');
    expect(elo).to.contain('.winner .player-persona-emerald { color: #009468; }');
    expect(elo).not.to.contain('font-family: Georgia');
    expect(elo).not.to.contain('font-family: "Trebuchet MS"');
    expect(elo).not.to.contain('font-family: Verdana');
    expect(elo).not.to.contain('font-family: "Segoe UI"');
  });
});

import {expect} from 'chai';
import {readFileSync} from 'fs';
import {DEFAULT_PLAYER_COLORS, PLAYER_COLORS, RESERVED_PLAYER_COLORS} from '../src/common/Color';

function read(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

function cssBlock(source: string, selector: string): string {
  const match = source.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[\\s\\S]*?\\n\\}`));
  return match?.[0] ?? '';
}

function expectCssContains(source: string, expected: string): void {
  expect(source.replace(/\s+/g, ' ')).to.contain(expected.replace(/\s+/g, ' '));
}

describe('Styles', () => {
  it('uses a reserved coral pink treatment for the Toma persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');

    expect(variables).to.contain('@player_hydro: rgb(255, 102, 102);');
    expect(variables).to.contain('@player_hydro_token_gradient: linear-gradient(135deg, #ffd6d6 0%, @player_hydro 52%, #8f1f1f 100%);');
    expect(variables).to.contain('@player_hydro_tag_bg: rgba(255, 102, 102, 0.24);');
    expect(common).to.contain('.player_bg_color_hydro');
    expect(common).to.contain('#fff5f5');
    expect(common).not.to.contain('linear-gradient(90deg, @player_hydro, #254ec6)');
    expect(board).to.contain('.board-cube--hydro');
    expect(board).to.contain('content: "♂"');
    expect(playerHome).to.contain('&.colonies-fleet-hydro');
    expect(playerHome).to.contain('background-color: rgba(255, 102, 102, 0.24);');
    expect(turmoil).to.contain('&.hydro');
    expect(playerSymbol).to.contain("hydro: '♂'");
    expect(vpChart).to.contain("['hydro']: 'rgb(255, 102, 102)'");
  });

  it('uses a reserved pearl treatment for the GydRo persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');

    expect(variables).to.contain('@player_pearl: rgb(242, 248, 248);');
    expect(variables).to.contain('@player_pearl_sprite_filter: grayscale(1) brightness(1.58) contrast(0.82) saturate(0.25);');
    expect(common).to.contain('.player_bg_color_pearl');
    expect(common).to.contain('#102027');
    expect(board).to.contain('.board-cube--pearl');
    expect(board).to.contain('content: "✧"');
    expect(playerHome).to.contain('&.colonies-fleet-pearl');
    expect(playerHome).to.contain('background-color: rgba(242, 248, 248, 0.24);');
    expect(turmoil).to.contain('&.pearl');
    expect(playerSymbol).to.contain("pearl: '✧'");
    expect(vpChart).to.contain("['pearl']: 'rgb(242, 248, 248)'");
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

  it('uses a reserved hydrangea blue treatment for the Olesia persona', () => {
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

  it('uses a reserved dark burgundy treatment for the Serge persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');

    expect(variables).to.contain('@player_serge: rgb(76, 12, 31);');
    expect(variables).to.contain('@player_serge_token_gradient: linear-gradient(135deg, @player_serge_light 0%, @player_serge 52%, @player_serge_dark 100%);');
    expect(common).to.contain('.player_bg_color_serge');
    expect(board).to.contain('.board-cube--serge');
    expect(board).to.contain('content: "S"');
    expect(playerHome).to.contain('&.colonies-fleet-serge');
    expect(turmoil).to.contain('&.serge');
    expect(playerSymbol).to.contain("serge: 'S'");
    expect(vpChart).to.contain("['serge']: 'rgb(76, 12, 31)'");
  });

  it('uses a reserved coral treatment for the Pasha persona', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');

    expect(variables).to.contain('@player_turquoise: rgb(224, 54, 105);');
    expect(variables).to.contain('@player_turquoise_token_gradient: linear-gradient(135deg, @player_turquoise_light 0%, @player_turquoise 52%, @player_turquoise_dark 100%);');
    expect(variables).to.contain('@player_turquoise_sprite_filter: hue-rotate(18deg) saturate(1.70) brightness(0.78) contrast(1.20);');
    expect(common).to.contain('.player_bg_color_turquoise');
    expect(common).to.contain('#fff2f5');
    expect(board).to.contain('.board-cube--turquoise');
    expect(board).to.contain('content: "◇"');
    expect(playerHome).to.contain('&.colonies-fleet-turquoise');
    expect(turmoil).to.contain('&.turquoise');
    expect(playerSymbol).to.contain("turquoise: '◇'");
  });

  it('uses persona cube tokens for reserved player cubes', () => {
    const variables = read('src/styles/variables.less');
    const board = read('src/styles/board.less');

    expect(variables).to.contain('@player_gold_token_gradient: linear-gradient(135deg, #e7c86b 0%, #b78322 52%, #604000 100%);');
    expect(variables).to.contain('@player_hydro_token_gradient: linear-gradient(135deg, #ffd6d6 0%, @player_hydro 52%, #8f1f1f 100%);');
    expect(variables).to.contain('@player_turquoise_token_gradient: linear-gradient(135deg, @player_turquoise_light 0%, @player_turquoise 52%, @player_turquoise_dark 100%);');
    expect(variables).to.contain('@player_gold_sprite_filter: sepia(0.45) saturate(1.65) hue-rotate(346deg) brightness(0.90) contrast(1.12);');
    expect(variables).to.contain('@player_emerald_sprite_filter: hue-rotate(18deg) saturate(1.70) brightness(0.72) contrast(1.12);');
    expect(variables).to.contain('@player_pearl_sprite_filter: grayscale(1) brightness(1.58) contrast(0.82) saturate(0.25);');
    expect(variables).to.contain('@player_antistress_sprite_filter: saturate(1.35) brightness(0.58) contrast(1.22);');
    expect(variables).to.contain('@player_gambit_sprite_filter: hue-rotate(315deg) saturate(0.55) brightness(1.22) contrast(1.03);');
    expect(variables).to.contain('@player_turquoise_sprite_filter: hue-rotate(18deg) saturate(1.70) brightness(0.78) contrast(1.20);');
    expect(variables).to.contain('@player_serge_sprite_filter: hue-rotate(18deg) saturate(1.75) brightness(0.48) contrast(1.32);');
    expectCssContains(board, '.board-cube--gold {\n  background: url(./assets/board_icons.png) -72px -91px no-repeat;');
    expect(cssBlock(board, '.board-cube--gold')).to.contain('@player_gold_sprite_filter');
    expectCssContains(board, '.board-cube--emerald {\n  background: url(./assets/board_icons.png) -1px -91px no-repeat;');
    expect(cssBlock(board, '.board-cube--emerald')).to.contain('@player_emerald_sprite_filter');
    expectCssContains(board, '.board-cube--ginger {\n  background: url(./assets/board_icons.png) -1px -117px no-repeat;');
    expectCssContains(board, '.board-cube--hydro {\n  background: url(./assets/board_icons.png) -24px -117px no-repeat;');
    expectCssContains(board, '.board-cube--pearl {\n  background: url(./assets/board_icons.png) -118px -91px no-repeat;');
    expectCssContains(board, '.board-cube--antistress {\n  background: url(./assets/board_icons.png) -94px -91px no-repeat;');
    expectCssContains(board, '.board-cube--gambit {\n  background: url(./assets/board_icons.png) -118px -91px no-repeat;');
    expectCssContains(board, '.board-cube--turquoise {\n  background: url(./assets/board_icons.png) -24px -117px no-repeat;');
    expect(cssBlock(board, '.board-cube--turquoise')).to.contain('@player_turquoise_sprite_filter');
    expectCssContains(board, '.board-cube--serge {\n  background: url(./assets/board_icons.png) -24px -117px no-repeat;');
    expect(cssBlock(board, '.board-cube--serge')).to.contain('@player_serge_sprite_filter');
    expect(board).to.contain('.board-cube--persona');
    expect(cssBlock(board, '.board-cube--persona')).to.contain('background: transparent;');
    expect(cssBlock(board, '.board-cube--persona::before')).to.contain('transform: rotate(45deg);');
    expectCssContains(board, '.board-cube--gold.board-cube--persona::before {\n  background: @player_gold_token_gradient;');
    expectCssContains(board, '.board-cube--hydro.board-cube--persona::before {\n  background: @player_hydro_token_gradient;');
    expectCssContains(board, '.board-cube--turquoise.board-cube--persona::before {\n  background: @player_turquoise_token_gradient;');
    expectCssContains(board, '.board-cube--serge.board-cube--persona::before {\n  background: @player_serge_token_gradient;');
  });

  it('adds persona cube classes for reserved Mars and Moon board spaces', () => {
    const boardSpace = read('src/client/components/BoardSpace.vue');
    const moonSpace = read('src/client/components/moon/MoonSpace.vue');

    expect(boardSpace).to.contain('isReservedPlayerColor');
    expect(boardSpace).to.contain("css += ' board-cube--persona';");
    expect(boardSpace).to.contain("let css = 'board-cube board-cube--' + this.space.color;");
    expect(moonSpace).to.contain('isReservedPlayerColor');
    expect(moonSpace).to.contain("let css = 'board-cube board-cube--' + this.space.color;");
    expect(moonSpace).to.contain("let css = 'board-cube-coOwner board-cube--' + this.space.coOwner;");
  });

  it('uses persona cube classes for milestones, awards, and colony cubes', () => {
    const playerHome = read('src/styles/player_home.less');
    const milestone = read('src/client/components/Milestone.vue');
    const milestones = read('src/client/components/Milestones.vue');
    const award = read('src/client/components/Award.vue');
    const awards = read('src/client/components/Awards.vue');
    const colonySpace = read('src/client/components/colonies/ColonySpace.vue');

    expectCssContains(playerHome, '.ma-player {\n  margin: 25px 0 0 70px;');
    expectCssContains(playerHome, '.board-cube {\n  margin: 0;');
    expect(playerHome).not.to.contain('transform: scale(1.45);');
    expect(playerHome).not.to.contain('transform: scale(0.95);');
    expect(playerHome).not.to.contain('transform: scale(0.9);');
    for (const component of [milestone, milestones, award, awards, colonySpace]) {
      expect(component).to.contain('isReservedPlayerColor(');
      expect(component).to.contain('board-cube--persona');
      expect(component).to.contain('board-cube--');
      expect(component).not.to.contain("' overlay'");
    }
  });

  it('uses sprite-based custom colony fleets matching standard fleet sprites', () => {
    const playerHome = read('src/styles/player_home.less');
    const board = read('src/styles/board.less');

    expect(playerHome).not.to.contain('.colonies-fleet-gradient');
    expect(playerHome).not.to.contain('mix-blend-mode');
    expect(playerHome).not.to.contain('radial-gradient(ellipse');
    expect(playerHome).not.to.contain('.colonies-fleet-badge');
    expect(playerHome).not.to.contain('content: @glyph');
    expect(playerHome).not.to.contain('.colonies-fleet-persona');
    expect(playerHome).not.to.contain('mask-image: url(./assets/colony_ships.png);');
    expect(playerHome).to.contain('&.colonies-fleet-gold');
    expect(cssBlock(playerHome, '&.colonies-fleet-gold')).to.contain('background-position: -70px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-gold')).to.contain('@player_gold_sprite_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-emerald')).to.contain('background-position: -140px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-emerald')).to.contain('@player_emerald_sprite_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-ginger')).to.contain('background-position: -416px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-hydro')).to.contain('background-position: -490px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-hydro')).to.contain('@player_hydro_fleet_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-pearl')).to.contain('background-position: -70px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-pearl')).to.contain('@player_pearl_fleet_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-antistress')).to.contain('background-position: -272px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-gambit')).to.contain('background-position: -342px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-turquoise')).to.contain('background-position: -490px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-turquoise')).to.contain('@player_turquoise_sprite_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-serge')).to.contain('background-position: -207px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-serge')).to.contain('@player_serge_fleet_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-saturn')).to.contain('background-position: -70px 0;');
    expect(cssBlock(board, '.board-cube--saturnrings')).to.contain('background: url(./assets/board_icons.png) -72px -91px no-repeat;');
    expect(cssBlock(board, '.board-cube--saturnstorm')).to.contain('background: url(./assets/board_icons.png) -24px -117px no-repeat;');
    expect(cssBlock(playerHome, '&.colonies-fleet-saturn')).to.contain('@player_saturn_fleet_filter @player_persona_fleet_edge_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-saturnrings')).to.contain('background-position: -70px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-saturnrings')).to.contain('@player_saturnrings_fleet_filter @player_persona_fleet_edge_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-titan')).to.contain('background-position: -416px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-titan')).to.contain('@player_titan_fleet_filter @player_persona_fleet_edge_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-saturnstorm')).to.contain('background-position: -490px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-saturnstorm')).to.contain('@player_saturnstorm_fleet_filter @player_persona_fleet_edge_filter');
    expect(cssBlock(playerHome, '&.colonies-fleet-catseye')).to.contain('background-position: -140px 0;');
    expect(cssBlock(playerHome, '&.colonies-fleet-catseye')).to.contain('@player_catseye_fleet_filter @player_persona_fleet_edge_filter');
  });

  it('covers every player color across board, colony, award, and profile surfaces', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const playerHome = read('src/styles/player_home.less');
    const turmoil = read('src/styles/turmoil.less');
    const createGame = read('src/styles/create_game_form.less');
    const playerSymbol = read('src/client/utils/playerSymbol.ts');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');
    const defaultColors = new Set<string>(DEFAULT_PLAYER_COLORS);
    const reservedColors = new Set<string>(RESERVED_PLAYER_COLORS);

    expect(common).to.contain('.player_bg_color_@{value}');
    expect(common).to.contain('.player_translucent_bg_color_@{value}');

    for (const color of PLAYER_COLORS) {
      expect(variables, `${color} variable`).to.contain(`@player_${color}:`);
      expect(board, `${color} board cube`).to.contain(`.board-cube--${color}`);
      expect(board, `${color} board overlay`).to.contain(`.board-cube--${color}.overlay::after`);
      expect(playerHome, `${color} colony fleet`).to.contain(`&.colonies-fleet-${color}`);
      expect(playerSymbol, `${color} symbol`).to.contain(`${color}: '`);
      expect(vpChart, `${color} VP chart`).to.contain(`['${color}']:`);

      if (defaultColors.has(color)) {
        expect(variables, `${color} default player list`).to.match(new RegExp(`@players:[^;]*\\b${color}\\b`));
      }

      if (reservedColors.has(color)) {
        expect(variables, `${color} token gradient`).to.contain(`@player_${color}_token_gradient:`);
        expect(variables, `${color} tag background`).to.contain(`@player_${color}_tag_bg:`);
        expect(common, `${color} reserved background`).to.contain(`.player_bg_color_${color}`);
        expect(common, `${color} reserved translucent background`).to.contain(`.player_translucent_bg_color_${color}`);
        expect(board, `${color} persona board token`).to.contain(`.board-cube--${color}.board-cube--persona::before`);
        expect(playerHome, `${color} tag overview`).to.contain(`player_tag_bg_color_${color}`);
        expect(createGame, `${color} create-game profile surface`).to.contain(`player_translucent_bg_color_${color}`);
        expect(turmoil, `${color} turmoil delegate token`).to.contain(`&.${color}`);
      }
    }
  });

  it('uses sprite-based Turmoil delegate tokens with the shared count style', () => {
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
    expect(turmoil).not.to.contain('.player-token__number');
    expect(turmoil).to.contain('.count-in-send-delegate');
    expect(cssBlock(turmoil, '.count-in-send-delegate')).to.contain('font-size: 22px;');
    expect(turmoil).to.contain('z-index: 1;');
    expect(turmoil).to.contain('z-index: 0;');
    expect(cssBlock(turmoil, '.count-in-send-delegate')).not.to.contain('color: #fff;');
    expect(cssBlock(turmoil, '.count-in-send-delegate')).not.to.contain('text-shadow');
    expect(turmoil).not.to.contain('text-shadow: 0 1px 1px #000, 0 0 2px #000;');
    expect(turmoil).to.contain('&.gold');
    expect(cssBlock(turmoil, '&.gold')).to.contain('.player-token-sprite(-644px, -35px, @player_gold_sprite_filter);');
    expect(cssBlock(turmoil, '&.emerald')).to.contain('.player-token-sprite(-865px, -35px, @player_emerald_sprite_filter);');
    expect(cssBlock(turmoil, '&.ginger')).to.contain('.player-token-sprite(-644px, -105px, @player_ginger_sprite_filter);');
    expect(cssBlock(turmoil, '&.hydro')).to.contain('.player-token-sprite(-699px, -105px, none);');
    expect(cssBlock(turmoil, '&.hydro')).to.contain('color: #fff5f5;');
    expect(cssBlock(turmoil, '&.hydro')).to.contain('background: @player_hydro_token_gradient;');
    expect(cssBlock(turmoil, '&.hydro')).to.contain('mask-image: url(./assets/turmoil_ui.png);');
    expect(cssBlock(turmoil, '&.pearl')).to.contain('.player-token-sprite(-973px, -35px, @player_pearl_delegate_filter);');
    expect(cssBlock(turmoil, '&.pearl')).to.contain('color: #102027;');
    expect(cssBlock(turmoil, '&.antistress')).to.contain('.player-token-sprite(-809px, -35px, @player_antistress_sprite_filter);');
    expect(cssBlock(turmoil, '&.gambit')).to.contain('.player-token-sprite(-973px, -35px, @player_gambit_sprite_filter);');
    expect(cssBlock(turmoil, '&.turquoise')).to.contain('.player-token-sprite(-699px, -105px, none);');
    expect(cssBlock(turmoil, '&.turquoise')).to.contain('background: @player_turquoise_token_gradient;');
    expect(cssBlock(turmoil, '&.turquoise')).to.contain('mask-image: url(./assets/turmoil_ui.png);');
    expect(cssBlock(turmoil, '&.saturn')).to.contain('.player-token-sprite(-644px, -35px, @player_saturn_delegate_filter);');
    expect(cssBlock(turmoil, '&.serge')).to.contain('.player-token-sprite(-699px, -105px, @player_serge_delegate_filter);');
    expect(cssBlock(turmoil, '&.saturnrings')).to.contain('.player-token-sprite(-644px, -35px, @player_saturnrings_delegate_filter);');
    expect(cssBlock(turmoil, '&.titan')).to.contain('.player-token-sprite(-644px, -105px, @player_titan_delegate_filter);');
    expect(cssBlock(turmoil, '&.saturnstorm')).to.contain('.player-token-sprite(-699px, -105px, @player_saturnstorm_delegate_filter);');
    expect(cssBlock(turmoil, '&.catseye')).to.contain('.player-token-sprite(-865px, -35px, @player_catseye_delegate_filter);');
  });

  it('keeps GenuineGold text dark on gold UI surfaces', () => {
    const common = read('src/styles/common.less');
    const createGame = read('src/styles/create_game_form.less');

    expectCssContains(common, '.player_bg_color_gold {\n  background-color: @player_gold;\n  color: #000000;');
    expectCssContains(common, '.player_translucent_bg_color_gold {\n  .player_gold_bg_translucent();\n  color: #000000;');
    expectCssContains(common, '.player_translucent_bg_color_gold .player-name {\n  color: #000000;');
    expect(common).to.contain('.player_translucent_bg_color_gold td,\n.player_translucent_bg_color_gold .game-end-name-and-elo,');
    expect(common).to.contain('text-shadow: none;');
    expect(createGame).to.contain('.create-game-player-field-theme(#000000, #fff2a6);');
    expect(createGame).not.to.contain('background: linear-gradient(90deg, #f7d95b, @player_gold);');
  });

  it('keeps standard player colors at their original palette values', () => {
    const variables = read('src/styles/variables.less');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');

    expect(variables).to.contain('@player_red: rgb(153, 17, 0);');
    expect(variables).to.contain('@player_yellow: rgb(170, 170, 0);');
    expect(variables).to.contain('@player_green: rgb(0, 153, 0);');
    expect(variables).to.contain('@player_black: rgb(170, 170, 170);');
    expect(variables).to.contain('@player_blue: rgb(0, 102, 255);');
    expect(variables).to.contain('@player_purple: rgb(140, 0, 255);');
    expect(variables).to.contain('@player_orange: rgb(236, 113, 12);');
    expect(variables).to.contain('@player_pink: rgb(245, 116, 187);');

    expect(vpChart).to.contain("['red']: 'rgb(153, 17, 0)'");
    expect(vpChart).to.contain("['yellow']: 'rgb(170, 170, 0)'");
    expect(vpChart).to.contain("['green']: 'rgb(0, 153, 0)'");
    expect(vpChart).to.contain("['black']: 'rgb(170, 170, 170)'");
    expect(vpChart).to.contain("['blue']: 'rgb(0, 102, 255)'");
    expect(vpChart).to.contain("['purple']: 'rgb(140, 0, 255)'");
    expect(vpChart).to.contain("['orange']: 'rgb(236, 113, 12)'");
    expect(vpChart).to.contain("['pink']: 'rgb(245, 116, 187)'");
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

  it('uses solid persona backgrounds and readable milestone/award score text', () => {
    const common = read('src/styles/common.less');
    const playerHome = read('src/styles/player_home.less');

    for (const selector of ['.player_bg_color_emerald', '.player_bg_color_ginger', '.player_bg_color_hydro', '.player_bg_color_pearl', '.player_bg_color_antistress', '.player_bg_color_gambit', '.player_bg_color_turquoise', '.player_bg_color_serge', '.player_bg_color_saturn', '.player_bg_color_saturnrings', '.player_bg_color_titan', '.player_bg_color_saturnstorm', '.player_bg_color_catseye']) {
      const block = cssBlock(common, selector);
      expect(block).to.contain('background-color:');
      expect(block).not.to.contain('linear-gradient');
    }
    expect(cssBlock(playerHome, '.ma-score')).to.contain('color: black;');
    for (const selector of ['red', 'green', 'blue', 'purple', 'emerald', 'ginger', 'hydro', 'antistress', 'turquoise', 'serge', 'saturnstorm']) {
      expect(playerHome).to.contain(`.ma-score.player_bg_color_${selector}`);
    }
    expect(playerHome).to.contain('color: #fff;');
    expect(cssBlock(playerHome, '.ma-score.player_bg_color_hydro')).to.contain('color: #fff5f5;');
    expect(cssBlock(playerHome, '.ma-score.player_bg_color_saturnstorm')).to.contain('color: #ffe5e8;');
  });

  it('keeps GydRo pearl names black while counters stay readable', () => {
    const common = read('src/styles/common.less');

    expect(common).to.contain('.player_translucent_bg_color_pearl .player-info-details,');
    expect(common).to.contain('.player_translucent_bg_color_pearl .player-info-corp,');
    expectCssContains(common, '.player_translucent_bg_color_pearl .tag-count-display {\n  color: #ffffff;');
    expectCssContains(common, '.player_translucent_bg_color_pearl .tag-count-display {\n  color: #ffffff;\n  text-shadow: 0 2px 2px black;');
    expectCssContains(common, '.player_translucent_bg_color_pearl .resource_item .resource_item_stock_count {\n  color: #ffffff;');
    expectCssContains(common, '.player_translucent_bg_color_pearl .resource_item .resource_item_prod_count {\n  color: #bb8760;');
    expect(common).to.contain('color: #ffffff;');
    expectCssContains(common, '.player_translucent_bg_color_pearl .player-name {\n  color: #000000;');
    expectCssContains(common, '.player_translucent_bg_color_pearl .game-end-name-and-elo a {\n  text-shadow: none;');
  });

  it('uses Vanger plain green persona surfaces', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const playerHome = read('src/styles/player_home.less');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');
    const eloBadge = read('src/client/components/overview/PlayerEloBadge.vue');

    expect(variables).to.contain('@player_vanger: rgb(0, 255, 0);');
    expect(variables).to.contain('@player_vanger_tag_bg: rgba(0, 255, 0, 0.24);');
    expect(playerHome).to.contain('background-color: rgba(0, 255, 0, 0.24);');
    expect(vpChart).to.contain("['vanger']: 'rgb(0, 255, 0)'");
    expect(eloBadge).to.contain('box-shadow: 0 0 7px rgba(0, 255, 0, 0.42);');
    expect(common).to.contain('.player_translucent_bg_color_vanger .player-info-corp,');
    expect(common).to.contain('.player_translucent_bg_color_vanger .player-info-corp,\n.player_translucent_bg_color_vanger td,');
    expect(cssBlock(common, '.player_bg_color_vanger.log-player,\n.player_translucent_bg_color_vanger .player-info-name,\n.player_translucent_bg_color_vanger .player-info-corp,\n.player_translucent_bg_color_vanger .player_name,\n.player_translucent_bg_color_vanger .game-end-name-and-elo,\n.player_translucent_bg_color_vanger .game-end-name-and-elo a,\n.player_translucent_bg_color_vanger .player-name')).to.contain('color: #001f00;');
  });

  it('keeps the create-game profile picker usable on narrow screens', () => {
    const createGame = read('src/styles/create_game_form.less');

    expect(cssBlock(createGame, '.create-game-profile-picker')).to.contain('overflow: visible;');
    expect(cssBlock(createGame, '.create-game-players-cont .container')).to.contain('overflow: visible;');
    expect(cssBlock(createGame, '.create-game-profile-menu')).to.contain('position: absolute;');
    expect(cssBlock(createGame, '.create-game-profile-menu')).to.contain('top: calc(100% + 6px);');
    expect(cssBlock(createGame, '.create-game-profile-menu')).to.contain('display: flex;');
    expect(cssBlock(createGame, '.create-game-profile-menu')).to.contain('overflow: hidden;');
    expect(cssBlock(createGame, '.create-game-profile-menu')).to.contain('z-index: 80;');
    expect(cssBlock(createGame, '.create-game-profile-option-list')).to.contain('flex: 1 1 auto;');
    expect(cssBlock(createGame, '.create-game-profile-option-list')).to.contain('overflow-y: auto;');
    expect(cssBlock(createGame, '.create-game-profile-option-list')).to.contain('overscroll-behavior: contain;');
    expect(cssBlock(createGame, '.create-game-profile-option-list')).to.contain('scrollbar-gutter: stable;');
    expect(cssBlock(createGame, '.create-game-profile-option-list')).to.contain('scrollbar-width: thin;');
    expect(cssBlock(createGame, '.create-game-profile-option-list')).to.contain('scrollbar-color: rgba(255,255,255,.58) rgba(0,0,0,.22);');
    expect(cssBlock(createGame, '.create-game-profile-option-list::-webkit-scrollbar')).to.contain('width: 10px;');
    expect(cssBlock(createGame, '.create-game-profile-option-list::-webkit-scrollbar-thumb')).to.contain('background: rgba(255,255,255,.58);');
    expect(cssBlock(createGame, '.create-game-profile-option')).to.contain('min-height: 44px;');
    expect(createGame).to.contain('@media (hover: none), (pointer: coarse) {');
    expect(createGame).to.contain('max-width: calc(100vw - 24px);');
  });

  it('keeps the old Hydro red-pink treatment available for legacy Toma games', () => {
    const variables = read('src/styles/variables.less');
    const common = read('src/styles/common.less');
    const board = read('src/styles/board.less');
    const createGame = read('src/styles/create_game_form.less');
    const playerHome = read('src/styles/player_home.less');
    const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');

    expect(variables).to.contain('@player_saturnstorm: rgb(190, 31, 72);');
    expect(variables).to.contain('@player_saturnstorm_sprite_filter: hue-rotate(18deg) saturate(1.55) brightness(0.68) contrast(1.18);');
    expect(cssBlock(common, '.player_bg_color_saturnstorm')).to.contain('color: #ffe5e8;');
    expect(cssBlock(board, '.board-cube--saturnstorm')).to.contain('background: url(./assets/board_icons.png) -24px -117px no-repeat;');
    expect(cssBlock(board, '.board-cube--saturnstorm')).to.contain('@player_saturnstorm_sprite_filter');
    expect(cssBlock(board, '.underground-excavator--saturnstorm')).to.contain('#ff8fa8 0%, @player_saturnstorm 46%, #5b001b 100%');
    expectCssContains(createGame, '.player_translucent_bg_color_saturnstorm {\n  .create-game-player-field-theme(#ffe5eb, #640014);');
    expect(playerHome).to.contain('background-color: rgba(190, 31, 72, 0.24);');
    expect(vpChart).to.contain("['saturnstorm']: 'rgb(190, 31, 72)'");
  });

  it('uses a monotone translucent persona overview background', () => {
    const mixins = read('src/styles/mixins.less');

    expect(mixins).to.contain('.player_persona_bg_translucent(@accent)');
    expect(mixins).to.contain('background-color: fade(@base, 82%)');
    expect(mixins).to.contain('.player_hydro_bg_translucent()');
    expect(mixins).to.contain('.player_pearl_bg_translucent()');
    expect(mixins).to.contain('.player_antistress_bg_translucent()');
    expect(mixins).to.contain('.player_gambit_bg_translucent()');
    expect(mixins).to.contain('.player_turquoise_bg_translucent()');
    expect(mixins).to.contain('.player_serge_bg_translucent()');
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
      'player-persona-pearl',
      'player-persona-antistress',
      'player-persona-gambit',
      'player-persona-turquoise',
      'player-persona-serge',
      'player-persona-saturn',
    ]) {
      expect(elo).to.contain(className);
    }

    expect(elo).to.contain('"антистресс": "player-persona-antistress"');
    expect(elo).to.contain('"gambitgirl": "player-persona-gambit"');
    expect(elo).to.contain('"олеся игнатова": "player-persona-gambit"');
    expect(elo).to.contain('"паша": "player-persona-turquoise"');
    expect(elo).to.contain('"pavel": "player-persona-turquoise"');
    expect(elo).to.contain('"gydro": "player-persona-pearl"');
    expect(elo).to.contain('"руслан": "player-persona-pearl"');
    expect(elo).to.contain('"serge": "player-persona-serge"');
    expect(elo).to.contain('"тома": "player-persona-hydro"');
    expect(elo).to.contain('"соня": "player-persona-hydro"');
    expect(elo).to.contain('.winner .player-persona-emerald { color: #009468; }');
    expect(elo).to.contain('.winner .player-persona-hydro { color: #ff6666; }');
    expect(elo).to.contain('.winner .player-persona-pearl { color: #eafcff; }');
    expect(elo).to.contain('.winner .player-persona-serge { color: #b53a58; }');
    expect(elo).to.contain('.winner .player-persona-saturnstorm { color: #be1f48; }');
    expect(elo).not.to.contain('font-family: Georgia');
    expect(elo).not.to.contain('font-family: "Trebuchet MS"');
    expect(elo).not.to.contain('font-family: Verdana');
    expect(elo).not.to.contain('font-family: "Segoe UI"');
  });

  it('keeps synthetic smoke-test players out of the ELO UI', () => {
    const elo = read('elo/index.html');

    expect(elo).to.contain('var HIDDEN_ELO_PLAYERS = {');
    expect(elo).to.contain('"a": true');
    expect(elo).to.contain('"b": true');
    expect(elo).to.contain('"c": true');
    expect(elo).to.contain('function isHiddenEloPlayer(name, displayName)');
    expect(elo).to.contain('if (isHiddenEloPlayer(name, p.displayName)) continue;');
    expect(elo).to.contain('return visibleGameResults(g).some(function(r) { return r.name === _filterPlayer; });');
  });

  it('shows finish time and duration in recent ELO games', () => {
    const elo = read('elo/index.html');

    expect(elo).to.contain('function formatGameDate(game)');
    expect(elo).to.contain('function formatGameDuration(game)');
    expect(elo).to.contain('var dateText = formatGameDate(g);');
    expect(elo).to.contain('var durationText = formatGameDuration(g);');
    expect(elo).to.contain('class=\\"game-time\\" title=\\"Finished time\\"');
    expect(elo).to.contain('class=\\"game-duration\\" title=\\"Game duration\\"');
    expect(elo).to.contain('.game-time { color: #b8b8b8; }');
    expect(elo).to.contain('.game-duration { color: #c4a35a; }');
  });
});

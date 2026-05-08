import {expect} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

type EloPageData = {
  players: Record<string, {
    displayName: string;
    elo: number;
    elo_vp: number;
    games: number;
    avgPlace: number;
    avgVP: number;
    avgGens: number;
    avgMargin: number;
  }>;
  games: Array<{
    gameId: string;
    endId: string;
    server: string;
    generation: number;
    results: Array<{
      name: string;
      displayName: string;
      place: number;
      vp: number;
      corp: string;
      delta: number;
    }>;
  }>;
};

type EloCardStatsData = Array<{
  name: string;
  type: string;
  tags: Array<string>;
  played: number;
  wins: number;
  winRate: number;
  avgVP: number;
  avgEloDelta: number | null;
}>;

type EloStatsData = {
  gameCount: number;
  playerGameCount: number;
  detailedGameCount?: number;
  detailedPlayerGameCount?: number;
  players: Array<{
    name: string;
    displayName: string;
    games: number;
    wins: number;
    winRate: number;
    avgVP: number;
    bestVP: number;
    averages: Record<string, number>;
    timing?: {
      games: number;
      avgTimeSeconds: number;
      avgSecondsPerAction: number;
    };
  }>;
  generationRecords: Array<{
    generation: number;
    player: string;
    displayName: string;
    vp: number;
    corp: string;
    gameId: string;
    server: string;
  }>;
  records: Array<{
    key: string;
    category: string;
    label: string;
    value: number;
    valueText?: string;
    player: string;
    displayName: string;
    generation: number;
    vp: number;
    corp: string;
    gameId: string;
    server: string;
  }>;
  cardStats: EloCardStatsData;
  corporationStats?: EloCardStatsData;
  preludeStats?: EloCardStatsData;
};

type EloSoloRecordsData = {
  records: Array<{
    gameId: string;
    endId?: string;
    server: string;
    name: string;
    displayName: string;
    soloWin?: boolean;
    vp: number;
    generation: number;
    corp: string;
    map: string;
    mode: string;
    completedTime: number;
  }>;
};

type JsdomInstance = {
  window: Window & {close: () => void};
};

const {JSDOM} = require('jsdom') as {
  JSDOM: new (html: string, options: Record<string, unknown>) => JsdomInstance;
};

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function getCells(document: Document, selector: string): Array<string> {
  return Array.from(document.querySelectorAll(selector)).map((cell) => cleanText(cell.textContent));
}

function dispatchChange(document: Document, element: HTMLElement): void {
  const event = document.createEvent('Event');
  event.initEvent('change', true, false);
  element.dispatchEvent(event);
}

async function waitForRows(dom: JsdomInstance): Promise<void> {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (dom.window.document.querySelectorAll('#tbody tr').length > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for ELO table rows');
}

async function waitForSoloRows(dom: JsdomInstance, count: number): Promise<void> {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (dom.window.document.querySelectorAll('#soloRecordsBody tr').length >= count) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for solo records rows');
}

function createEloPage(data: EloPageData, statsData?: EloStatsData, soloData: EloSoloRecordsData = {records: []}): JsdomInstance {
  const html = fs.readFileSync(path.join(process.cwd(), 'elo', 'index.html'), 'utf8');
  return new JSDOM(html, {
    url: 'https://tm.knightbyte.win/elo/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window: Window) {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        value: (input: string) => {
          const url = String(input);
          if (url.includes('solo-records.json')) {
            return Promise.resolve({ok: true, json: () => Promise.resolve(soloData)});
          }
          if (url.includes('stats.json')) {
            return Promise.resolve({ok: Boolean(statsData), json: () => Promise.resolve(statsData)});
          }
          return Promise.resolve({ok: true, json: () => Promise.resolve(data)});
        },
      });
      const windowWithHTMLElement = window as unknown as {HTMLElement: typeof HTMLElement};
      Object.defineProperty(windowWithHTMLElement.HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: () => {},
      });
    },
  });
}

describe('ELO page', () => {
  it('renders generation/margin columns, recent game deltas, and VP-margin rating mode', async () => {
    const dom = createEloPage({
      players: {
        'gydro': {
          displayName: 'GydRo',
          elo: 1613,
          elo_vp: 1596,
          games: 14,
          avgPlace: 0.75,
          avgVP: 102,
          avgGens: 8.857,
          avgMargin: 5.214,
        },
        'рав': {
          displayName: 'Рав',
          elo: 1498,
          elo_vp: 1498,
          games: 11,
          avgPlace: 0.455,
          avgVP: 94,
          avgGens: 9.455,
          avgMargin: -14.091,
        },
        'тома': {
          displayName: 'Тома',
          elo: 1465,
          elo_vp: 1465,
          games: 6,
          avgPlace: 0.417,
          avgVP: 88,
          avgGens: 9,
          avgMargin: -14,
        },
      },
      games: [
        {
          gameId: 'gd4cdbfa90b69',
          endId: 'sa347ca33dd48',
          server: 'knightbyte',
          generation: 10,
          results: [
            {name: 'gydro', displayName: 'GydRo', place: 1, vp: 125, corp: 'Teractor|Lakefront Resorts', delta: 17},
            {name: 'рав', displayName: 'Рав', place: 2, vp: 124, corp: 'Tharsis Republic|Sagitta Frontier Services', delta: 3},
            {name: 'тома', displayName: 'Тома', place: 3, vp: 97, corp: 'Morning Star Inc.|Tycho Magnetics', delta: -20},
          ],
        },
      ],
    });

    await waitForRows(dom);
    const document = dom.window.document;

    expect(getCells(document, 'body > table thead th')).deep.eq(['#', 'Player', 'ELO', 'Avg place', 'Games', 'Avg VP', 'Avg gen', 'VP Margin']);
    expect(cleanText(document.querySelector('#stats')?.textContent)).eq('3 players | 1 games | Avg gen 10');
    expect(getCells(document, '#tbody tr:first-child td')).deep.eq(['1', 'GydRo', '1613', '0.75', '14', '102', '8.9', '+5.2']);
    expect(cleanText(document.querySelector('#matchupsSummary')?.textContent)).eq('3 players with 5+ games | 3 played pairs | most frequent: GydRo / Рав (1)');
    expect(cleanText(document.querySelector('#matchupsPairCard')?.textContent)).eq('');
    expect((document.querySelector('#matchupPlayerA') as HTMLSelectElement).value).eq('');
    expect((document.querySelector('#matchupPlayerB') as HTMLSelectElement).value).eq('');
    expect(getCells(document, '#matchupsTable thead th')).deep.eq(['Player', 'GydRo', 'Рав', 'Тома']);
    expect(getCells(document, '#matchupsTable tbody tr:first-child td')).deep.eq(['GydRo', '', '1-0 +1', '1-0 +28']);

    const recentGamesText = cleanText(document.querySelector('#gamesList')?.textContent);
    expect(recentGamesText).contains('gd4cdbfa90b69');
    expect(recentGamesText).contains('(+17)');
    expect(recentGamesText).contains('(+3)');
    expect(recentGamesText).contains('(-20)');

    const vpTab = Array.from(document.querySelectorAll('.tab')).find((tab) => cleanText(tab.textContent) === 'By VP Margin') as HTMLElement | undefined;
    expect(vpTab).not.eq(undefined);
    vpTab?.click();
    expect(getCells(document, '#tbody tr:first-child td')).deep.eq(['1', 'GydRo', '1596', '0.75', '14', '102', '8.9', '+5.2']);
    expect(getCells(document, '#matchupsTable tbody tr:first-child td')).deep.eq(['GydRo', '', '1-0 +1', '1-0 +28']);

    dom.window.close();
  });

  it('keeps solo record columns fixed when toggling result filters', async () => {
    const dom = createEloPage({
      players: {
        'genuinegold': {
          displayName: 'GenuineGold',
          elo: 1709,
          elo_vp: 1709,
          games: 29,
          avgPlace: 0.79,
          avgVP: 96,
          avgGens: 9.3,
          avgMargin: 2.9,
        },
      },
      games: [],
    }, undefined, {
      records: [
        {
          gameId: 'g9e52260e16f3',
          endId: 's-win',
          server: 'knightbyte',
          name: 'genuinegold',
          displayName: 'GenuineGold',
          soloWin: true,
          vp: 240,
          generation: 12,
          corp: 'Tycho Magnetics',
          map: 'elysium',
          mode: 'TR 63 · Venus, Colonies, Prelude, Prelude 2, Turmoil',
          completedTime: 1778137080,
        },
        {
          gameId: 'g42548fa8e9c5',
          endId: 's-loss',
          server: 'knightbyte',
          name: 'genuinegold',
          displayName: 'GenuineGold',
          soloWin: false,
          vp: 66,
          generation: 12,
          corp: 'PhoboLog|Tycho Magnetics',
          map: 'Hollandia',
          mode: 'TR 63 · Venus, Colonies, Prelude, Prelude 2, Turmoil',
          completedTime: 1778057520,
        },
      ],
    });

    await waitForRows(dom);
    const document = dom.window.document;
    const soloTab = Array.from(document.querySelectorAll('.tab')).find((tab) => cleanText(tab.textContent) === 'Solo Records') as HTMLElement | undefined;
    expect(soloTab).not.eq(undefined);
    soloTab?.click();
    await waitForSoloRows(dom, 1);

    expect(Array.from(document.querySelectorAll('.solo-table col')).map((col) => col.className)).deep.eq([
      'solo-col-rank',
      'solo-col-player',
      'solo-col-result',
      'solo-col-vp',
      'solo-col-gen',
      'solo-col-corp',
      'solo-col-mode',
      'solo-col-date',
      'solo-col-game',
    ]);
    expect(document.querySelector('.solo-table')?.outerHTML).contains('<colgroup>');
    expect(getCells(document, '#soloRecordsBody tr')).lengthOf(1);

    const allGamesButton = document.querySelector('[data-solo-filter="all"]') as HTMLElement;
    allGamesButton.click();
    await waitForSoloRows(dom, 2);

    expect(getCells(document, '#soloRecordsBody tr')).lengthOf(2);
    expect(document.querySelector('#soloRecordsBody tr:nth-child(2) td:nth-child(6)')?.className).eq('solo-corp');
    expect(document.querySelector('#soloRecordsBody tr:nth-child(2) td:nth-child(7)')?.className).eq('solo-mode');
    expect(document.querySelector('#soloRecordsBody tr:nth-child(2) td:nth-child(9)')?.className).eq('solo-game');

    dom.window.close();
  });

  it('renders a matchup matrix for players with at least five games only', async () => {
    const dom = createEloPage({
      players: {
        'gydro': {
          displayName: 'GydRo',
          elo: 1613,
          elo_vp: 1596,
          games: 7,
          avgPlace: 0.75,
          avgVP: 102,
          avgGens: 8.857,
          avgMargin: 5.214,
        },
        'рав': {
          displayName: 'Рав',
          elo: 1498,
          elo_vp: 1498,
          games: 6,
          avgPlace: 0.455,
          avgVP: 94,
          avgGens: 9.455,
          avgMargin: -14.091,
        },
        'тома': {
          displayName: 'Тома',
          elo: 1465,
          elo_vp: 1465,
          games: 5,
          avgPlace: 0.417,
          avgVP: 88,
          avgGens: 9,
          avgMargin: -14,
        },
        'inactive': {
          displayName: 'Inactive',
          elo: 1800,
          elo_vp: 1800,
          games: 0,
          avgPlace: 0,
          avgVP: 0,
          avgGens: 0,
          avgMargin: 0,
        },
        'below': {
          displayName: 'Below5',
          elo: 1700,
          elo_vp: 1700,
          games: 4,
          avgPlace: 0.5,
          avgVP: 89,
          avgGens: 9,
          avgMargin: 0,
        },
      },
      games: [
        {
          gameId: 'g1',
          endId: 's1',
          server: 'knightbyte',
          generation: 9,
          results: [
            {name: 'gydro', displayName: 'GydRo', place: 1, vp: 100, corp: 'Teractor', delta: 15},
            {name: 'рав', displayName: 'Рав', place: 2, vp: 92, corp: 'Inventrix', delta: -15},
          ],
        },
        {
          gameId: 'g2',
          endId: 's2',
          server: 'knightbyte',
          generation: 10,
          results: [
            {name: 'gydro', displayName: 'GydRo', place: 1, vp: 125, corp: 'Teractor', delta: 8},
            {name: 'рав', displayName: 'Рав', place: 2, vp: 124, corp: 'Inventrix', delta: 1},
            {name: 'тома', displayName: 'Тома', place: 3, vp: 97, corp: 'Helion', delta: -9},
            {name: 'below', displayName: 'Below5', place: 4, vp: 88, corp: 'Mining Guild', delta: -14},
          ],
        },
      ],
    });

    await waitForRows(dom);
    const document = dom.window.document;

    expect(cleanText(document.querySelector('#matchupsSummary')?.textContent)).eq('3 players with 5+ games | 3 played pairs | most frequent: GydRo / Рав (2)');
    expect(cleanText(document.querySelector('#matchupsPairCard')?.textContent)).eq('');
    expect(getCells(document, '#matchupsTable thead th')).deep.eq(['Player', 'GydRo', 'Рав', 'Тома']);
    expect(getCells(document, '#matchupsTable tbody tr:nth-child(1) td')).deep.eq(['GydRo', '', '2-0 +4.5', '1-0 +28']);
    expect(getCells(document, '#matchupsTable tbody tr:nth-child(2) td')).deep.eq(['Рав', '0-2 -4.5', '', '1-0 +27']);
    expect(getCells(document, '#matchupsTable tbody tr:nth-child(3) td')).deep.eq(['Тома', '0-1 -28', '0-1 -27', '']);
    expect(cleanText(document.querySelector('#matchupsTable')?.textContent)).not.contains('Inactive');
    expect(cleanText(document.querySelector('#matchupsTable')?.textContent)).not.contains('Below5');

    const selectA = document.querySelector('#matchupPlayerA') as HTMLSelectElement;
    const selectB = document.querySelector('#matchupPlayerB') as HTMLSelectElement;
    selectA.value = 'тома';
    dispatchChange(document, selectA);
    selectB.value = 'gydro';
    dispatchChange(document, selectB);
    expect(cleanText(document.querySelector('#matchupsPairCard .matchups-pair-title')?.textContent)).eq('Тома vs GydRo');
    expect(getCells(document, '#matchupsPairCard .matchups-pair-value')).deep.eq(['W0 L1', '1', '0%', '-28 VP']);

    const ravVsTomaCell = document.querySelector('#matchupsTable tbody tr:nth-child(2) td:nth-child(4)') as HTMLElement;
    ravVsTomaCell.click();
    expect(cleanText(document.querySelector('#matchupsPairCard .matchups-pair-title')?.textContent)).eq('Рав vs Тома');
    expect(getCells(document, '#matchupsPairCard .matchups-pair-value')).deep.eq(['W1 L0', '1', '100%', '+27 VP']);

    dom.window.close();
  });

  it('keeps the matchup matrix visible before two players reach five games', async () => {
    const dom = createEloPage({
      players: {
        'gydro': {
          displayName: 'GydRo',
          elo: 1613,
          elo_vp: 1596,
          games: 4,
          avgPlace: 0.75,
          avgVP: 102,
          avgGens: 8.857,
          avgMargin: 5.214,
        },
        'рав': {
          displayName: 'Рав',
          elo: 1498,
          elo_vp: 1498,
          games: 3,
          avgPlace: 0.455,
          avgVP: 94,
          avgGens: 9.455,
          avgMargin: -14.091,
        },
      },
      games: [
        {
          gameId: 'g1',
          endId: 's1',
          server: 'knightbyte',
          generation: 9,
          results: [
            {name: 'gydro', displayName: 'GydRo', place: 1, vp: 100, corp: 'Teractor', delta: 15},
            {name: 'рав', displayName: 'Рав', place: 2, vp: 92, corp: 'Inventrix', delta: -15},
          ],
        },
      ],
    });

    await waitForRows(dom);
    const document = dom.window.document;

    expect(cleanText(document.querySelector('#matchupsSummary')?.textContent)).eq('2 played players | 0 with 5+ games | 1 played pairs | most frequent: GydRo / Рав (1)');
    expect(getCells(document, '#matchupsTable thead th')).deep.eq(['Player', 'GydRo', 'Рав']);
    expect(getCells(document, '#matchupsTable tbody tr:first-child td')).deep.eq(['GydRo', '', '1-0 +8']);

    dom.window.close();
  });

  it('labels equal-VP matchup results as same VP instead of an opaque tie', async () => {
    const dom = createEloPage({
      players: {
        alice: {
          displayName: 'Alice',
          elo: 1510,
          elo_vp: 1510,
          games: 5,
          avgPlace: 0.5,
          avgVP: 100,
          avgGens: 9,
          avgMargin: 0,
        },
        bob: {
          displayName: 'Bob',
          elo: 1500,
          elo_vp: 1500,
          games: 5,
          avgPlace: 0.5,
          avgVP: 100,
          avgGens: 9,
          avgMargin: 0,
        },
      },
      games: [
        {
          gameId: 'same-vp-game',
          endId: 'same-vp-end',
          server: 'knightbyte',
          generation: 9,
          results: [
            {name: 'alice', displayName: 'Alice', place: 1, vp: 100, corp: 'CrediCor', delta: 0},
            {name: 'bob', displayName: 'Bob', place: 1, vp: 100, corp: 'Inventrix', delta: 0},
          ],
        },
      ],
    });

    await waitForRows(dom);
    const document = dom.window.document;

    expect(getCells(document, '#matchupsTable tbody tr:first-child td')).deep.eq(['Alice', '', '0-0 1 VP= 0']);
    const sameVpCell = document.querySelector('#matchupsTable tbody tr:first-child td:nth-child(3)') as HTMLElement;
    expect(sameVpCell.getAttribute('title')).contains('1 same VP');
    expect(sameVpCell.getAttribute('title')).not.contains('ties');

    sameVpCell.click();
    expect(cleanText(document.querySelector('#matchupsPairCard .matchups-pair-title')?.textContent)).eq('Alice vs Bob');
    expect(getCells(document, '#matchupsPairCard .matchups-pair-value')).deep.eq(['W0 L0 1 same VP', '1', '50%', '0 VP']);
    expect(cleanText(document.querySelector('#matchupsPairCard')?.textContent)).contains('same VP means equal final VP');

    dom.window.close();
  });

  it('keeps reserved persona colors on recent game winners', async () => {
    const dom = createEloPage({
      players: {
        'catharsis': {
          displayName: 'Catharsis🔥',
          elo: 1530,
          elo_vp: 1530,
          games: 1,
          avgPlace: 1,
          avgVP: 104,
          avgGens: 8,
          avgMargin: 12,
        },
        'рав': {
          displayName: 'Рав',
          elo: 1490,
          elo_vp: 1490,
          games: 1,
          avgPlace: 0,
          avgVP: 92,
          avgGens: 8,
          avgMargin: -12,
        },
      },
      games: [
        {
          gameId: 'staging-elo-demo-catharsis',
          endId: 's-catharsis',
          server: 'knightbyte',
          generation: 8,
          results: [
            {name: 'catharsis', displayName: 'Catharsis🔥', place: 1, vp: 104, corp: 'Valley Trust', delta: 24},
            {name: 'рав', displayName: 'Рав', place: 2, vp: 92, corp: 'Factorum', delta: -24},
          ],
        },
      ],
    });

    await waitForRows(dom);
    const winnerName = dom.window.document.querySelector('.game-card .winner .pname') as HTMLElement | null;

    expect(winnerName?.classList.contains('player-persona-ginger')).eq(true);
    expect(dom.window.getComputedStyle(winnerName!).color).eq('rgb(255, 138, 66)');

    dom.window.close();
  });

  it('renders generated statistics records and tfmstats-style card rows', async () => {
    const dom = createEloPage({
      players: {
        'gydro': {
          displayName: 'GydRo',
          elo: 1613,
          elo_vp: 1596,
          games: 5,
          avgPlace: 1,
          avgVP: 100,
          avgGens: 8,
          avgMargin: 8,
        },
        'рав': {
          displayName: 'Рав',
          elo: 1487,
          elo_vp: 1490,
          games: 1,
          avgPlace: 0,
          avgVP: 92,
          avgGens: 8,
          avgMargin: -8,
        },
      },
      games: [
        {
          gameId: 'stats-game',
          endId: 'stats-end',
          server: 'knightbyte',
          generation: 8,
          results: [
            {name: 'gydro', displayName: 'GydRo', place: 1, vp: 100, corp: 'Teractor', delta: 13},
            {name: 'рав', displayName: 'Рав', place: 2, vp: 92, corp: 'Inventrix', delta: -13},
          ],
        },
      ],
    }, {
      gameCount: 1,
      playerGameCount: 2,
      detailedGameCount: 1,
      detailedPlayerGameCount: 2,
      players: [
        {
          name: 'gydro',
          displayName: 'GydRo',
          games: 1,
          wins: 1,
          winRate: 100,
          avgVP: 100,
          bestVP: 100,
          averages: {
            playedCards: 12,
            eventCards: 2,
            activeCards: 3,
            automatedCards: 5,
            cities: 2,
            greeneries: 4,
          },
          timing: {
            games: 1,
            avgTimeSeconds: 600,
            avgSecondsPerAction: 12.3,
          },
        },
      ],
      generationRecords: [
        {
          generation: 8,
          player: 'gydro',
          displayName: 'GydRo',
          vp: 100,
          corp: 'Teractor',
          gameId: 'stats-game',
          server: 'knightbyte',
        },
      ],
      records: [
        {
          key: 'mostEvents',
          category: 'Cards',
          label: 'Most events',
          value: 7,
          player: 'gydro',
          displayName: 'GydRo',
          generation: 8,
          vp: 100,
          corp: 'Teractor',
          gameId: 'stats-game',
          server: 'knightbyte',
        },
        {
          key: 'fastestSecondsPerAction',
          category: 'Timing',
          label: 'Fastest sec/action',
          value: 11.4,
          valueText: '11.4 sec/action',
          player: 'gydro',
          displayName: 'GydRo',
          generation: 8,
          vp: 100,
          corp: 'Teractor',
          gameId: 'stats-game',
          server: 'knightbyte',
        },
      ],
      cardStats: [
        {
          name: 'Asteroid',
          type: 'event',
          tags: ['space', 'event'],
          played: 3,
          wins: 2,
          winRate: 66.7,
          avgVP: 96.3,
          avgEloDelta: 4.5,
        },
      ],
      corporationStats: [
        {
          name: 'Teractor',
          type: 'corporation',
          tags: ['earth'],
          played: 2,
          wins: 1,
          winRate: 50,
          avgVP: 96,
          avgEloDelta: 1.5,
        },
      ],
      preludeStats: [
        {
          name: 'Applied Science',
          type: 'prelude',
          tags: ['wild'],
          played: 1,
          wins: 1,
          winRate: 100,
          avgVP: 100,
          avgEloDelta: 13,
        },
      ],
    });

    await waitForRows(dom);
    const document = dom.window.document;
    const statsTab = Array.from(document.querySelectorAll('.tab')).find((tab) => cleanText(tab.textContent) === 'Stats') as HTMLElement | undefined;
    expect(statsTab).not.eq(undefined);
    statsTab?.click();

    expect(getCells(document, '#tmStatsOverview .value').slice(0, 4)).deep.eq(['1', '1', '2', '1']);
    expect(getCells(document, '#tmStatsGenerationBody tr:first-child td')).deep.eq(['8', 'GydRo', '100', 'Teractor', 'stats-game']);
    expect(getCells(document, '#tmStatsPlayersBody tr:first-child td')).deep.eq(['GydRo', '1 / 5 ELO', '1', '10m', '12.3s', '100%', '100', '100', '12', '2', '3', '5', '2', '4']);
    expect(getCells(document, '#tmStatsRecordsBody tr:first-child td')).deep.eq(['Cards · Most events', '7', 'GydRo', 'Gen 8 · 100 VP · Teractor', 'stats-game']);
    expect(getCells(document, '#tmStatsRecordsBody tr:nth-child(2) td')).deep.eq(['Timing · Fastest sec/action', '11.4 sec/action', 'GydRo', 'Gen 8 · 100 VP · Teractor', 'stats-game']);
    expect(getCells(document, '#tmStatsCardsBody tr:first-child td')).deep.eq(['Asteroid', 'event', '3', '66.7%', '96.3', '+4.5', 'space, event']);
    expect(getCells(document, '#tmStatsCorporationsBody tr:first-child td')).deep.eq(['Teractor', 'corporation', '2', '50%', '96', '+1.5', 'earth']);
    expect(getCells(document, '#tmStatsPreludesBody tr:first-child td')).deep.eq(['Applied Science', 'prelude', '1', '100%', '100', '+13', 'wild']);

    dom.window.close();
  });
});

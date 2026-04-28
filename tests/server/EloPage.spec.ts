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

async function waitForRows(dom: JsdomInstance): Promise<void> {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (dom.window.document.querySelectorAll('#tbody tr').length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for ELO table rows');
}

function createEloPage(data: EloPageData): JsdomInstance {
  const html = fs.readFileSync(path.join(process.cwd(), 'elo', 'index.html'), 'utf8');
  return new JSDOM(html, {
    url: 'https://tm.knightbyte.win/elo/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window: Window) {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        value: () => Promise.resolve({json: () => Promise.resolve(data)}),
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

    expect(getCells(document, 'thead th')).deep.eq(['#', 'Player', 'ELO', 'Avg place', 'Games', 'Avg VP', 'Avg gen', 'VP Margin']);
    expect(cleanText(document.querySelector('#stats')?.textContent)).eq('3 players | 1 games | Avg gen 10');
    expect(getCells(document, '#tbody tr:first-child td')).deep.eq(['1', 'GydRo', '1613', '0.75', '14', '102', '8.9', '+5.2']);

    const recentGamesText = cleanText(document.querySelector('#gamesList')?.textContent);
    expect(recentGamesText).contains('gd4cdbfa90b69');
    expect(recentGamesText).contains('(+17)');
    expect(recentGamesText).contains('(+3)');
    expect(recentGamesText).contains('(-20)');

    const vpTab = Array.from(document.querySelectorAll('.tab')).find((tab) => cleanText(tab.textContent) === 'By VP Margin') as HTMLElement | undefined;
    expect(vpTab).not.eq(undefined);
    vpTab?.click();
    expect(getCells(document, '#tbody tr:first-child td')).deep.eq(['1', 'GydRo', '1596', '0.75', '14', '102', '8.9', '+5.2']);

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
});

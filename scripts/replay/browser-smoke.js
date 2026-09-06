async function replaySmoke(page) {
  const url = await page.evaluate(() => ({hostname: location.hostname, pathname: location.pathname,
    spectatorId: new URLSearchParams(location.search).get('id'), origin: location.origin}));
  if (url.hostname !== '127.0.0.1' || url.pathname !== '/replay' || url.spectatorId !== 'spectator-id-replay-ui') {
    throw new Error('Open the generated local replay fixture first');
  }
  const requests = [];
  const responses = [];
  const errors = [];
  const observed = [];
  const requestListener = (request) => {
    if (request.url().includes('/api/')) {
      requests.push({url: request.url(), method: request.method()});
    }
  };
  const responseListener = (response) => {
    if (response.url().startsWith(url.origin + '/api/replay?')) {
      responses.push(response.text());
    }
  };
  const errorListener = (error) => errors.push(String(error));
  const consoleListener = (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  };
  page.on('request', requestListener);
  page.on('response', responseListener);
  page.on('pageerror', errorListener);
  page.on('console', consoleListener);

  async function frame(saveId, generation, megacredits, phase) {
    await page.locator(`[data-replay-save="${saveId}"]`).waitFor({timeout: 10000});
    const actual = await page.evaluate(() => ({
      status: document.querySelector('.replay-status').textContent,
      credits: Number(document.querySelector('.player-info.player_translucent_bg_color_blue .resource_item--megacredits [data-test="stock-count"]').textContent),
      production: document.querySelector('.player-info.player_translucent_bg_color_blue .resource_item--megacredits [data-test="production"]').textContent,
      log: document.querySelector('.replay-log ol').textContent.trim(),
      greenery: document.querySelector('[data_space_id="03"] [data-test="tile"]').classList.contains('board-space-tile--greenery'),
      text: document.body.textContent,
    }));
    if (!actual.status.includes(`Generation ${generation}`) || !actual.status.includes(phase) || actual.credits !== megacredits ||
      actual.production !== '+4' || actual.log !== `Public saved record ${saveId}` || actual.greenery !== (saveId > 0)) {
      throw new Error('Recorded frame mismatch: ' + saveId + ' ' + JSON.stringify({...actual, text: undefined}));
    }
    for (const marker of ['PRIVATE-REPLAY-MARKER', 'Birds', 'p-blue-replay-ui', 'p-red-replay-ui']) {
      if (actual.text.includes(marker)) {
        throw new Error('Private marker in replay DOM');
      }
    }
    observed.push({saveId, generation, megacredits, phase, greenery: actual.greenery});
  }

  try {
    await page.reload();
    await frame(0, 1, 30, 'drafting');
    if (!await page.getByRole('button', {name: 'First save', exact: true}).isDisabled()) {
      throw new Error('First boundary enabled');
    }
    await page.locator('.player-info.player_translucent_bg_color_blue .player-table-button').click();
    if (!await page.locator('.other_player .player_name').filter({hasText: 'Replay Blue'}).isVisible()) {
      throw new Error('Public cards did not open');
    }
    await page.getByRole('button', {name: 'Play replay', exact: true}).click();
    await frame(4, 2, 34, 'research');
    await page.getByRole('button', {name: 'Pause replay', exact: true}).click();
    await page.waitForTimeout(1200);
    await frame(4, 2, 34, 'research');
    await page.getByRole('button', {name: 'Next save', exact: true}).click();
    await frame(9, 3, 39, 'production');
    await page.getByRole('button', {name: 'Previous save', exact: true}).click();
    await frame(4, 2, 34, 'research');
    await page.getByRole('button', {name: 'Last save', exact: true}).click();
    await frame(12, 4, 42, 'end');
    if (!await page.getByRole('button', {name: 'Play replay', exact: true}).isDisabled()) {
      throw new Error('Playback did not stop at end');
    }
    await page.getByRole('button', {name: 'First save', exact: true}).click();
    await frame(0, 1, 30, 'drafting');
    const slider = page.getByRole('slider', {name: 'Saved state', exact: true});
    await slider.focus();
    await slider.press('End');
    await frame(12, 4, 42, 'end');
    await slider.press('Home');
    await frame(0, 1, 30, 'drafting');
    await slider.press('ArrowRight');
    await frame(4, 2, 34, 'research');
    await page.getByRole('combobox', {name: 'Replay speed', exact: true}).selectOption('4');
    await page.getByRole('button', {name: 'Play replay', exact: true}).click();
    await frame(9, 3, 39, 'production');
    await frame(12, 4, 42, 'end');
    if (!await page.getByRole('button', {name: 'Play replay', exact: true}).isDisabled()) {
      throw new Error('Fast playback did not stop');
    }
    const bodies = await Promise.all(responses);
    for (const body of bodies) {
      for (const marker of ['PRIVATE-REPLAY-MARKER', 'Birds', 'p-blue-replay-ui', 'p-red-replay-ui']) {
        if (body.includes(marker)) {
          throw new Error('Private marker in replay response');
        }
      }
    }
    if (requests.some((request) => request.method !== 'GET' || !request.url.startsWith(url.origin + '/api/replay?'))) {
      throw new Error('Unexpected game request during replay: ' + JSON.stringify(requests));
    }
    if (errors.length > 0) {
      throw new Error('Browser errors: ' + errors.join('; '));
    }
    return {observed, requests, responseCount: bodies.length, consoleErrors: errors.length};
  } finally {
    page.off('request', requestListener);
    page.off('response', responseListener);
    page.off('pageerror', errorListener);
    page.off('console', consoleListener);
  }
}

async function replayPerformance(page) {
  const origin = await page.evaluate(() => location.origin);
  if (!origin.startsWith('http://127.0.0.1:')) {
    throw new Error('Use the local synthetic server');
  }
  const active = new Set();
  const frameRequests = [];
  let maxActive = 0;
  const started = (request) => {
    if (request.url().startsWith(origin + '/api/replay?') && request.url().includes('saveId=')) {
      active.add(request);
      frameRequests.push(request.url());
      maxActive = Math.max(maxActive, active.size);
    }
  };
  const finished = (request) => active.delete(request);
  page.on('request', started);
  page.on('requestfinished', finished);
  page.on('requestfailed', finished);
  try {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(origin + '/replay?id=spectator-id-replay-perf');
    await page.locator('[data-replay-save="0"]').waitFor({timeout: 10000});
    const slider = page.getByRole('slider', {name: 'Saved state', exact: true});
    if (await slider.getAttribute('max') !== '99') {
      throw new Error('Expected 100 saved states');
    }
    await slider.focus();
    const samples = [];
    for (let position = 1; position <= 20; position++) {
      const start = Date.now();
      await slider.press('ArrowRight');
      await page.locator(`[data-replay-save="${position * 2}"]`).waitFor({timeout: 10000});
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const milliseconds = Date.now() - start;
      const credits = Number(await page.locator('.player-info.player_translucent_bg_color_blue .resource_item--megacredits [data-test="stock-count"]').textContent());
      if (credits !== 30 + position * 2) {
        throw new Error('Wrong frame in timing sample');
      }
      samples.push({saveId: position * 2, milliseconds});
    }
    const sorted = samples.map((sample) => sample.milliseconds).sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(samples.length * 0.95) - 1];
    if (p95 >= 2000 || maxActive > 1 || frameRequests.length !== 21) {
      throw new Error('Performance or request budget failed: ' + JSON.stringify({p95, maxActive, requests: frameRequests.length}));
    }
    return {samples, p95Milliseconds: p95, maxConcurrentFrames: maxActive, frameRequests: frameRequests.length,
      savedStates: 100, viewport: {width: 1280, height: 900},
      userAgent: await page.evaluate(() => navigator.userAgent)};
  } finally {
    page.off('request', started);
    page.off('requestfinished', finished);
    page.off('requestfailed', finished);
  }
}

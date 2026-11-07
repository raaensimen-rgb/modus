'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit } = require('playwright');
const { startPublicPackageServer } = require('./public-package-server.cjs');

async function check(browser, engine, base, locale, width) {
  const prefix = locale === 'en' ? '/en/' : '/';
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  async function acceptPremises() {
    if (await page.locator('.modus-premises-dialog[open]').count()) {
      await page.locator('#modus-premises-accept').check();
      await page.locator('.modus-premises-confirm').click();
    }
  }

  async function follow(link) {
    await link.evaluate(element => element.scrollIntoView({ block: 'center' }));
    await link.click();
  }

  try {
    await page.goto(base + prefix);
    const studies = page.locator('#nav-learn');
    await studies.focus();
    await studies.press('ArrowDown');
    const entryLink = page.locator('#nav-panel-learn a[href="undervisning.html"]');
    await entryLink.waitFor({ state: 'visible' });
    await entryLink.focus();
    await entryLink.press('Enter');
    await page.waitForURL(url => url.pathname.replace(/\.html$/, '') === prefix + 'undervisning');

    const entry = page.locator('main[data-learning-entry]');
    await entry.waitFor();
    assert.equal(await entry.locator('h1').innerText(), locale === 'en' ? 'Lessons and Exercises' : 'Leksjoner og øvelser');
    assert.equal(await page.locator('main[data-publication-hold]').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const entryUrl = page.url();
    const article = entry.locator('a[href="artikler/toner-og-intervaller.html"]');
    await article.focus();
    await article.press('Enter');
    await acceptPremises();
    await page.locator('[data-quiz-id="toner-og-intervaller"]').waitFor();
    assert.equal(await page.locator('[data-publication-hold]').count(), 0);

    await page.goto(entryUrl);
    await follow(entry.locator('a[href^="teori.html?"]'));
    await acceptPremises();
    await page.locator('[data-topic="intervals"][aria-selected="true"]').waitFor();
    await page.locator('[data-route-return-link]').waitFor();

    await page.goto(entryUrl);
    await follow(entry.locator('a[href="grunnstudier.html"]'));
    await acceptPremises();
    await page.locator('.route-step').first().waitFor();
    assert.equal(await page.locator('.route-step').count(), locale === 'en' ? 16 : 52);
    await page.goto(entryUrl);
    await follow(entry.locator('a[href="artikler.html"]'));
    await acceptPremises();
    await page.locator('.article-card').first().waitFor();
    assert.equal(await page.locator('.article-card').count(), locale === 'en' ? 16 : 52);

    await page.goto(base + prefix + 'undervisning.html?modul=F03');
    await page.locator('main[data-publication-hold]').waitFor();
    assert.equal(await entry.count(), 0);
    assert.equal(await page.locator('#f03-piano,[data-quiz-id],.foundation-exercise').count(), 0);
    const privatePaths = ['undervisning.js', 'f03-atelier.js', 'course.js', 'editorial/legacy/undervisning.html'];
    for (const path of privatePaths) {
      assert.equal((await page.request.get(base + prefix + path)).status(), 404, path);
    }
    await page.goto(base + prefix + 'laer-dorisk.html');
    await page.locator('main[data-publication-hold]').waitFor();
    assert.deepEqual(errors, []);
    return { engine, locale, width, keyboard: true, publishedLinks: 4, legacyHolds: 2, privatePaths: privatePaths.length };
  } finally {
    await context.close();
  }
}

(async () => {
  const remote = process.env.MODUS_TEST_URL;
  assert(!remote || remote === 'https://modus-4ye.pages.dev');
  const server = remote ? null : await startPublicPackageServer(process.env.MODUS_TEST_DIST || '../package');
  const rows = [];
  try {
    for (const [name, engine] of Object.entries({ chromium, webkit })) {
      const browser = await engine.launch();
      try {
        for (const locale of ['nb', 'en']) {
          for (const width of [320, 375, 1440]) {
            rows.push(await check(browser, name, remote || server.origin, locale, width));
            console.log(JSON.stringify(rows.at(-1)));
          }
        }
      } finally {
        await browser.close();
      }
    }
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/learning-entry-' + (remote ? 'public' : 'local') + '.json', JSON.stringify(rows, null, 2) + '\n');
    console.log('PASS: ' + rows.length + ' learning entry scenarios');
  } finally {
    if (server) await server.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

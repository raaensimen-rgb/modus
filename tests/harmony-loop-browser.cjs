'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { startPublicPackageServer } = require('./public-package-server.cjs');

(async () => {
  const publicOrigin = process.env.MODUS_TEST_URL;
  const server = publicOrigin ? null : await startPublicPackageServer(path.resolve(__dirname, '../../package'));
  const origin = publicOrigin || server.origin;
  try {
    for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
      const browser = await launcher.launch();
      try {
        for (const locale of ['nb', 'en']) {
          const context = await browser.newContext({
            viewport: { width: locale === 'nb' ? 375 : 1440, height: 900 },
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.addInitScript(() => {
            window.harmonyStarts = [];
            const start = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (time, ...args) {
              window.harmonyStarts.push(time);
              return start.call(this, time, ...args);
            };
          });
          await page.goto(origin + (locale === 'en' ? '/en' : '') + '/akkorder.html');
          const dialog = page.locator('.modus-premises-dialog[open]');
          if (await dialog.isVisible()) {
            await page.locator('#modus-premises-accept').check();
            await page.locator('.modus-premises-confirm').click();
          }
          const button = page.locator('#playProgression');
          const checkbox = page.getByRole('checkbox', {
            name: locale === 'en' ? 'Loop progression' : 'Gjenta akkordrekken',
          });
          await checkbox.waitFor();
          assert.equal(await checkbox.isChecked(), false);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.locator('#progressionPreset').selectOption('pop');
          const slots = page.locator('.chord-slot');
          while (await slots.count() > 2) await slots.last().locator('.remove-chord').click();
          await page.locator('#chordTempo').fill('200');
          await page.locator('#chordTempo').press('Tab');
          const idle = await button.textContent();
          const chordStarts = () => page.evaluate(() => [...new Set(window.harmonyStarts)]);

          await button.click();
          await page.waitForFunction(() => new Set(window.harmonyStarts).size === 2);
          await page.getByText(idle, { exact: true }).waitFor({ timeout: 10000 });
          assert.equal((await chordStarts()).length, 2);

          await checkbox.check();
          await page.evaluate(() => { window.harmonyStarts.length = 0; });
          await button.click();
          await slots.nth(1).locator(':scope[aria-current="step"]').waitFor();
          await slots.first().locator(':scope[aria-current="step"]').waitFor();
          const starts = await chordStarts();
          assert(starts.length >= 4, 'The second round schedules both chords');
          for (let i = 1; i < 4; i++) {
            assert(Math.abs(starts[i] - starts[i - 1] - 1.2) < 0.001, 'Chord timing holds across the loop boundary');
          }
          await button.click();
          assert.equal(await button.textContent(), idle);
          assert(await checkbox.isEnabled());
          assert.equal(await page.locator('.chord-slot[aria-current="step"]').count(), 0);
          const stoppedStarts = await chordStarts();
          await page.waitForTimeout(2600);
          assert.deepEqual(await chordStarts(), stoppedStarts, 'Stop cancels future rounds');

          await page.evaluate(() => { window.harmonyStarts.length = 0; });
          await page.locator('#playSelected').click();
          await page.waitForFunction(() => window.harmonyStarts.length > 0);
          await page.getByText(idle, { exact: true }).waitFor({ timeout: 10000 });
          assert.equal((await chordStarts()).length, 1, 'Selected voicing remains a single play');
          assert.deepEqual(errors, []);
          console.log(engine, locale, 'PASS');
          await context.close();
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    if (server) await server.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

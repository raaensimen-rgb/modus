'use strict';

const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { startPublicPackageServer } = require('./public-package-server.cjs');

async function check(browser, origin, locale, switcher, palette) {
 const page = await browser.newPage({ viewport: { width: 375, height: 850 } });
 await page.addInitScript(value => {
  if (!localStorage.getItem('modus-palette-v1')) localStorage.setItem('modus-palette-v1', value);
 }, palette);
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 const fromArticle = 'toner-og-intervaller';
 try {
  const start = locale === 'en' ? '/en/skalabibliotek.html' : '/skalabibliotek.html';
  await page.goto(origin + start + '?root=E&mode=lydian&view=intervals&range=12-24&fromArticle=' + fromArticle);
  if (await page.locator('.modus-premises-dialog[open]').count()) {
   await page.locator('#modus-premises-accept').check();
   await page.locator('.modus-premises-confirm').click();
  }
  assert.equal(await page.locator('html').getAttribute('data-site-palette'), palette);
  const root = page.locator('#scale-root');
  await root.selectOption('F♯');
  assert.equal(new URL(page.url()).searchParams.get('root'), 'F♯');
  await page.reload();
  assert.equal(await root.inputValue(), 'F♯');
  if (switcher === 'tool') await page.locator('#scale-practice').click();
  await root.evaluate(select => {
   // WebKit limits repeated History API writes. Finish on the other root.
   for (let i = 0; i < 180; i++) {
    select.value = i % 2 ? 'C♯' : 'E';
    select.dispatchEvent(new Event('change', { bubbles: true }));
   }
  });
  assert.equal(await root.inputValue(), 'C♯');
  const target = locale === 'en' ? 'nb' : 'en';
  const link = switcher === 'tool'
   ? page.locator('#scale-language')
   : page.locator('.site-header [data-language="' + target + '"]');
  await link.click();
  assert.equal(await page.locator('html').getAttribute('lang'), target);
  assert.equal(await page.locator('html').getAttribute('data-site-palette'), palette);
  assert.equal(new URL(page.url()).searchParams.get('root'), 'C♯');
  assert.equal(await root.inputValue(), 'C♯');
  assert.equal(await page.locator('#scale-mode').inputValue(), 'lydian');
  assert.equal(await page.locator('#scale-view').inputValue(), 'intervals');
  assert.equal(await page.locator('#scale-range').inputValue(), '12-24');
  assert.equal(new URL(page.url()).searchParams.get('fromArticle'), fromArticle);
  assert.equal(await page.locator('#scale-practice').getAttribute('aria-pressed'), String(switcher === 'tool'));
  assert.deepEqual(errors, []);
 } finally {
  await page.close();
 }
}

async function main() {
 const server = await startPublicPackageServer(process.env.MODUS_TEST_DIST || '../package');
 let failed = 0;
 try {
  for (const [engine, type] of Object.entries({ chromium, webkit })) {
   const browser = await type.launch();
   try {
    for (const locale of ['nb', 'en']) {
     for (const switcher of ['tool', 'header']) for (const palette of ['original', 'blue']) {
      const label = [engine, locale, switcher, palette].join(' ');
      try {
       await check(browser, server.origin, locale, switcher, palette);
       console.log(label + ' passed');
      } catch (error) {
       failed++;
       console.error(label + ' failed:', error.message);
      }
     }
    }
   } finally {
    await browser.close();
   }
  }
 } finally {
  await server.stop();
 }
 process.exitCode = failed ? 1 : 0;
}

main().catch(error => { console.error(error); process.exitCode = 1; });

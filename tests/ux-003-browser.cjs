'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { startPublicPackageServer } = require('./public-package-server.cjs');

const [candidatePath, baselinePath, output] = process.argv.slice(2).map(p => path.resolve(p));
const store = 'modus-musikkart-v1';
const quiz = 'modus.article-quiz.v1.toner-og-intervaller';
const evidence = 'modus.atlas.article-evidence.v1';
const article = 'artikler/toner-og-intervaller.html';
const modulation = 'artikler/tonikalisering-og-modulering.html';
const auditory = 'artikler/auditiv-intervall-og-funksjonsprove.html';
const intervals = 'artikler/intervallomvendinger.html';
const topology = page => page.locator('#music-map').evaluate(svg => ({
  box: svg.getAttribute('viewBox'),
  nodes: [...svg.querySelectorAll('.map-node')].map(n =>
    [n.getAttribute('aria-label').split('. ')[0], n.querySelector('rect').outerHTML]),
  lines: [...svg.querySelectorAll('.map-branch')].map(n => [n.getAttribute('d'), n.getAttribute('stroke')]),
  globe: svg.querySelector('.atlas-globe').outerHTML,
}));

async function scenario(browser, engine, locale, width, candidate, baseline) {
  const context = await browser.newContext({ viewport: { width, height: 950 } });
  try {
    await context.addInitScript(({ store, quiz, evidence }) => {
      if (localStorage.getItem('atlas-test-seeded')) return;
      localStorage.setItem('atlas-test-seeded', 'true');
      localStorage.setItem(store, JSON.stringify({ I03: { state: 'exploring', note: 'Tidligere notat', idea: true } }));
      localStorage.setItem(quiz, 'passed');
      localStorage.setItem(evidence, JSON.stringify({ 'intervallomvendinger': { opened: true }, 'tonikalisering-og-modulering': { opened: true, passed: true } }));
    }, { store, quiz, evidence });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const route = (locale === 'en' ? '/en/' : '/') + 'musikkart.html';
    await page.goto(baseline + route);
    const expected = await topology(page);
    await page.goto(candidate + route + '?modul=F03');
    assert.equal(await page.locator('.branch-node').count(), 10);
    assert.equal(await page.locator('.module-node').count(), 24);
    assert.deepEqual(await topology(page), expected);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(await page.locator('#module-open').getAttribute('href'), article);
    assert(await page.locator('#module-practice').isVisible());
    assert.equal(await page.locator('[data-state=learned]').getAttribute('aria-pressed'), 'true');
    const related = page.locator('#atlas-articles a');
    assert.deepEqual(await related.evaluateAll(nodes => nodes.map(n => n.getAttribute('href'))),
      locale === 'nb' ? [intervals, auditory] : []);
    if (locale === 'nb') {
      await related.filter({ hasText: /Auditiv kontroll/ }).click();
      assert.match(page.url(), /\/artikler\/auditiv-intervall-og-funksjonsprove(?:\.html)?$/);
      assert(await page.locator('main article').isVisible());
      await page.goBack();
    }

    const node = id => page.locator(`[data-atlas-id="${id}"]`);
    const search = page.locator('#map-search');
    await search.fill(locale === 'nb' ? 'intervallomvendinger' : 'Roman numerals');
    assert.match(await node(locale === 'nb' ? 'F03' : 'I01').getAttribute('class'), /\bmatch\b/);
    await search.fill('tonikalisering og modulering');
    for (const id of ['A01', 'I02']) {
      assert.equal(await node(id).evaluate(el => el.classList.contains('match')), locale === 'nb');
    }
    await search.fill('');
    await page.keyboard.press('Tab');
    await node('I03').focus();
    assert(await node('I03').evaluate(el =>
      el.matches(':focus-visible') && getComputedStyle(el.querySelector('rect')).strokeWidth === '3px'));
    await page.keyboard.press('Space');
    assert(await node('I03').evaluate(el => el === document.activeElement), 'SVG button keeps keyboard focus');
    assert.equal(await node('I03').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Tab');
    assert(await node('A02').evaluate(el => el === document.activeElement), 'Tab advances to the next module');
    assert.equal(await page.locator('#map-personal-note').inputValue(), 'Tidligere notat');
    assert(await page.locator('#course-idea').isChecked());
    assert.equal(await page.locator('[data-state=exploring]').getAttribute('aria-pressed'), 'true');
    await page.locator('#map-personal-note').fill('Oppdatert notat');
    await page.reload();
    await node('I03').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#map-personal-note').inputValue(), 'Oppdatert notat');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), quiz), 'passed');

    await node('A01').focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#module-practice').isHidden());
    assert.deepEqual(await related.evaluateAll(nodes => nodes.map(n => n.getAttribute('href'))),
      locale === 'nb' ? ['artikler/sekundaerdominanter.html', modulation] : []);
    assert.equal(await page.locator('[data-state=not-started]').getAttribute('aria-pressed'), 'true');
    await node('I02').focus();
    await page.keyboard.press('Enter');
    assert.equal(await related.filter({ hasText: /Kadens og tonale funksjoner/ }).count(), locale === 'nb' ? 1 : 0);
    assert.equal(await page.locator(`#atlas-articles a[href="${modulation}"]`).count(), locale === 'nb' ? 1 : 0);
    assert.equal(await page.locator('[data-state=not-started]').getAttribute('aria-pressed'), 'true');
    const audit = await new AxeBuilder({ page }).include('.map-layout')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
    assert.deepEqual(errors, []);
    if (engine === 'chromium') {
      await page.locator('#inspector-heading').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${locale}-${width}-atlas.png`), fullPage: true });
    }
    return { engine, locale, width, topology: 'identical', axeViolations: 0, result: 'passed' };
  } finally {
    await context.close();
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const baseline = await startPublicPackageServer(baselinePath);
  const candidate = await startPublicPackageServer(candidatePath);
  const rows = [];
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      const browser = await type.launch();
      try {
        for (const locale of ['nb', 'en']) for (const width of [320, 375, 1440]) {
          rows.push(await scenario(browser, engine, locale, width, candidate.origin, baseline.origin));
          console.log(engine, locale, width, 'passed');
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    await candidate.stop();
    await baseline.stop();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(rows, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

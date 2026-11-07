'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { startPublicPackageServer } = require('./public-package-server.cjs');

const packagePath = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const article = 'toner-og-intervaller';
const quizzes = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/article-quizzes.json'), 'utf8'));

async function activate(page, target, keyboard) {
  if (keyboard) await page.keyboard.press('Tab');
  await target.focus();
  assert(await target.evaluate(el => el === document.activeElement),
    'Could not focus ' + target + ' at ' + page.url());
  if (keyboard) {
    const style = await target.evaluate(el => {
      const computed = getComputedStyle(el);
      return { visible: el.matches(':focus-visible'), outline: computed.outlineStyle,
        shadow: computed.boxShadow };
    });
    assert(style.visible && (style.outline !== 'none' || style.shadow !== 'none'),
      'Keyboard focus indicator is missing for ' + target + ' at ' + page.url() + ': ' + JSON.stringify(style));
    await page.keyboard.press('Enter');
  } else {
    await target.click();
  }
}

async function acceptPremises(page) {
  const accept = page.locator('#modus-premises-accept:visible');
  if (await accept.count()) {
    await accept.check();
    await page.locator('.modus-premises-confirm').click();
  }
}

async function checkWidth(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Page overflows at ' + page.url());
}

async function scenario(browser, origin, engine, locale, width, javascript) {
  const context = await browser.newContext({
    viewport: { width, height: 950 }, javaScriptEnabled: javascript, reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const prefix = locale === 'en' ? '/en/' : '/';
    const base = origin + prefix;
    const expectPage = async (slug) => {
      await page.waitForURL(url => url.pathname.replace(/\.html$/, '') === prefix + slug);
      await page.waitForLoadState('domcontentloaded');
      await page.locator('main').waitFor();
      if (javascript) await acceptPremises(page);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      await checkWidth(page);
    };
    const snapshot = async (label) => {
      if (engine === 'chromium' && javascript && [375, 1440].includes(width)) {
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${label}.png`) });
      }
    };
    await page.goto(base);
    if (javascript) await acceptPremises(page);
    await activate(page, page.locator('[data-start-learning]'), javascript);
    await expectPage('artikler');
    assert.equal(await page.locator('[data-article-id]').count(), locale === 'en' ? 16 : 52);
    await activate(page, page.locator('.start-recommended .card-main'), javascript);
    await expectPage('artikler/' + article);
    assert(await page.locator('[data-quiz-id]').isVisible());
    await activate(page, page.locator('.start-reading [rel=next]'), javascript);
    await expectPage('artikler/dur-og-moll');
    await activate(page, page.locator('.start-practice'), javascript);
    assert.equal(new URL(page.url()).hash, '#route-practice');
    const practice = page.locator('#route-practice a.button');
    assert.equal(new URL(await practice.getAttribute('href'), page.url()).searchParams.get('topic'), 'chords');
    await activate(page, page.locator('.start-reading [rel=prev]'), javascript);
    await expectPage('artikler/' + article);
    await activate(page, page.locator('.start-reading a[href^="../grunnstudier"]'), javascript);
    await expectPage('grunnstudier');
    assert.equal(await page.locator('[data-route-step]').count(), locale === 'en' ? 16 : 52);
    assert.match(await page.locator('.route-heading').innerText(), /valgfri leserekkefølge|optional reading order/);
    const atlasLink = page.locator('.learning-route a[href^="musikkart.html?modul=F03"]');
    await atlasLink.scrollIntoViewIfNeeded();
    await snapshot('route');
    await activate(page, atlasLink, javascript);
    await expectPage('musikkart');
    let piano;
    if (javascript) {
      await page.locator('#inspector-module:visible').waitFor();
      assert.match(await page.locator('#inspector-meta').innerText(), /\bF03\b/);
      assert.equal(await page.locator('#module-open').getAttribute('href'), `artikler/${article}.html`);
      await page.locator('#inspector-heading').scrollIntoViewIfNeeded();
      await snapshot('atlas');
      const audit = await new AxeBuilder({ page }).include('#inspector-module')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
      piano = page.locator('#module-practice');
    } else {
      piano = page.locator('.map-next a[href^="teori.html?topic=intervals"]');
    }
    await activate(page, piano, javascript);
    await expectPage('teori');
    const query = new URL(page.url()).searchParams;
    assert.equal(query.get('topic'), 'intervals');
    assert.equal(query.get('fromArticle'), article);
    if (javascript) {
      await acceptPremises(page);
      assert.equal(await page.locator('#tab-intervals').getAttribute('aria-selected'), 'true');
      await activate(page, page.locator('[data-route-return-link]:visible'), true);
      await expectPage('artikler/' + article);
      const quiz = page.locator('[data-quiz-id]');
      const answers = quizzes[article].questions ?? quizzes[article];
      for (const [index, answer] of answers.entries()) {
        await quiz.locator('fieldset').nth(index).locator('input').nth(answer.answer ?? answer.correct).check();
      }
      await quiz.locator('[type=submit]').click();
      await quiz.locator('.quiz-complete').waitFor();
      await page.goto(base);
      const resume = page.locator('[data-start-resume]:visible a');
      await resume.waitFor();
      assert.equal(await resume.getAttribute('href'), 'artikler/dur-og-moll.html');
      await page.goto(base + 'musikkart.html?modul=PRIVATE');
      assert(await page.locator('#inspector-module').isHidden());
      await page.goto(base + 'undervisning.html?modul=F03');
      await page.locator('main[data-publication-hold]').waitFor();
    }
    assert.deepEqual(errors, []);
    return { engine, locale, width, javascript, passed: true };
  } finally {
    await context.close();
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = await startPublicPackageServer(packagePath);
  const rows = [];
  try {
    for (const [engine, type] of Object.entries({ chromium, webkit })) {
      const browser = await type.launch();
      try {
        for (const locale of ['nb', 'en']) {
          for (const width of [320, 375, 768, 1440]) {
            rows.push(await scenario(browser, server.origin, engine, locale, width, true));
            console.log(engine, locale, width, 'passed');
          }
          rows.push(await scenario(browser, server.origin, engine, locale, 375, false));
        }
      } finally {
        await browser.close();
      }
    }
    console.log(`PASS: ${rows.length} UX-002 browser scenarios.`);
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(rows, null, 2) + '\n');
    await server.stop();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

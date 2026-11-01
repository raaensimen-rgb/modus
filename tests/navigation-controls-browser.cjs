'use strict';
// Run after npm run build. Checks actual layout and native targets in both engines.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium, webkit} = require('playwright');
const root = path.resolve(process.env.MODUS_TEST_DIST || path.resolve(__dirname, '../dist'));
const baselineCSS = process.env.MODUS_BASELINE_CSS && fs.readFileSync(process.env.MODUS_BASELINE_CSS, 'utf8');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.json':'application/json'};
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  try {
    for (const [name, engine] of Object.entries({chromium, webkit})) {
      const browser = await engine.launch({headless:true});
      try {
        for (const width of [1440, 1051, 768, 375, 320]) for (const zoom of [1, 2]) {
          // Browser-zoom reflow equivalent: halve the CSS viewport and double the pixel scale.
          // CSS zoom/pinch zoom do not exercise the same media-query breakpoints.
          const page = await browser.newPage({viewport:{width:Math.floor(width/zoom), height:1000}, deviceScaleFactor:zoom});
          for (const locale of ['', 'en/']) {
            await page.goto(base + '/' + locale);
            if (await page.locator('.modus-premises-dialog[open]').isVisible()) {
              await page.locator('#modus-premises-accept').check();
              await page.locator('.modus-premises-confirm').click();
              await page.locator('.modus-premises-dialog[open]').waitFor({state:'hidden'});
            }
            await page.evaluate(() => document.fonts.ready);
            if (baselineCSS) {
              const brandSnapshot = () => {
                const brand = document.querySelector('.site-header .brand');
                return [brand, ...brand.querySelectorAll('*')].map(e => {
                  const s = getComputedStyle(e);
                  return {html:e.outerHTML, styles:Object.fromEntries(['width','height','fontFamily','fontSize','fontWeight','letterSpacing','color','opacity','gap','marginLeft','marginRight','fill','stroke','transform'].map(p => [p,s[p]]))};
                });
              };
              const current = await page.evaluate(brandSnapshot);
              const baseline = await page.addStyleTag({content:baselineCSS});
              const original = await page.evaluate(brandSnapshot);
              await baseline.evaluate(e => e.remove());
              assert.deepEqual(current, original, `${name}/${width}/${zoom}: brand changed`);
            }
            for (const theme of ['original', 'readable', 'contrast']) {
              await page.evaluate(value => window.ModusTheme.apply(value), theme);
              const metrics = await page.evaluate(() => {
                const tools = document.querySelector('.header-tools');
                const controls = [...tools.querySelectorAll('.nav-membership,.nav-account,.global-search-trigger,.theme-picker>summary,.language-picker a')];
                return {
                  gap:getComputedStyle(tools).gap,
                  layout:(() => {
                    const header = document.querySelector('.site-header'), brand = header.querySelector('.brand').getBoundingClientRect(), nav = header.querySelector('.site-nav').getBoundingClientRect(), t = tools.getBoundingClientRect(), h = header.getBoundingClientRect(), s = getComputedStyle(header);
                    return {brandFits:brand.left>=0 && brand.right<=innerWidth+1, aligned:Math.abs(brand.left-nav.left)<1, below:nav.top>=Math.max(brand.bottom,t.bottom), right:Math.abs(t.right-(h.right-parseFloat(s.paddingRight)))<1, sameRow:Math.abs(brand.top+brand.height/2-(t.top+t.height/2))<1};
                  })(),
                  menuVisible:[...document.querySelectorAll('.site-nav>a,.nav-trigger')].every(e => {const r=e.getBoundingClientRect(); return r.width>0 && r.left>=0 && r.right<=innerWidth+1 && getComputedStyle(e).visibility==='visible';}),
                  overflow:document.documentElement.scrollWidth > innerWidth,
                  menu:[...document.querySelectorAll('.site-nav>a,.nav-trigger')].map(e => [getComputedStyle(e).fontSize,getComputedStyle(e).fontWeight]),
                  controls:controls.map(e => {
                    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
                    const pseudo = getComputedStyle(e, e.matches('.language-picker a') ? '::before' : '::after');
                    return {label:e.textContent, width:r.width, height:r.height, font:s.fontSize, weight:s.fontWeight,
                      frame:e.matches('.nav-membership') ? null : r.height-parseFloat(pseudo.top)-parseFloat(pseudo.bottom),
                      hit:[1,r.height-1].every(y => e.contains(document.elementFromPoint(r.x+r.width/2,r.y+y)))};
                  }),
                  active:document.querySelector('.language-picker [aria-current=true]').dataset.language,
                  activeBackground:getComputedStyle(document.querySelector('.language-picker [aria-current=true]'),'::before').backgroundColor
                };
              });
              assert.equal(metrics.gap, '8px');
              assert(metrics.layout.brandFits && metrics.layout.aligned && metrics.layout.below && metrics.layout.right, JSON.stringify(metrics.layout));
              if (width/zoom > 700) assert(metrics.layout.sameRow, JSON.stringify(metrics.layout));
              assert(metrics.menuVisible, 'All menu choices must fit');
              assert.equal(metrics.overflow, false, `${name}/${width}/${theme}: overflow`);
              assert.equal(metrics.active, locale ? 'en' : 'nb');
              assert.notEqual(metrics.activeBackground, 'rgba(0, 0, 0, 0)');
              for (const m of metrics.menu) assert.deepEqual(m, ['16px','600']);
              for (const c of metrics.controls) {
                assert(c.width >= 44 && c.height >= 44, JSON.stringify(c));
                if (c.frame !== null) assert.equal(c.frame,36,JSON.stringify(c));
                assert.equal(c.font,'13px'); assert.equal(c.weight,'600'); assert(c.hit,JSON.stringify(c));
              }
              if (name === 'chromium' && !locale && theme === 'original' && [1440,375,320].includes(width)) {
                fs.mkdirSync('test-results', {recursive:true});
                await page.locator('.site-header').screenshot({path:`test-results/navigation-v11-${width}-${zoom}x.png`});
              }
              const summary = page.locator('.theme-picker>summary');
              await summary.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
              assert(await summary.evaluate(e => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'));
              await page.keyboard.press('Enter'); assert(await page.locator('.theme-picker').evaluate(e => e.open));
              const options = page.locator('.theme-options');
              assert(await options.evaluate(e => {const r=e.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth+1;}), 'Theme panel fits viewport');
              await page.keyboard.press('Escape'); assert(await summary.evaluate(e => document.activeElement === e));
              for (const menu of await page.locator('.nav-trigger').all()) {
                await menu.focus(); await page.keyboard.press('ArrowDown');
                assert.equal(await menu.getAttribute('aria-expanded'),'true');
                const panel = page.locator('#' + await menu.getAttribute('aria-controls'));
                assert(await panel.evaluate(e => {const r=e.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth+1;}), 'Dropdown fits viewport');
                assert(await panel.locator('a').first().evaluate(e => document.activeElement===e));
                await page.keyboard.press('Escape'); assert.equal(await menu.getAttribute('aria-expanded'),'false');
              }
              await summary.click();
              const checkedTheme = await page.locator('.theme-options input:checked').inputValue();
              const selectedTheme = checkedTheme === 'original' ? 'readable' : 'original';
              await page.locator(`.theme-options input[value="${selectedTheme}"]`).check();
              assert.equal(await page.locator('html').getAttribute('data-theme'), selectedTheme);
              assert(await summary.evaluate(e => document.activeElement===e && !e.parentElement.open));
              const search = page.locator('.global-search-trigger');
              await search.click(); await page.locator('[data-global-search-input]').waitFor({state:'visible'});
              await page.evaluate(() => { window.searchClosed = new Promise(resolve => document.querySelector('[data-global-search-dialog]').addEventListener('close', () => requestAnimationFrame(resolve), {once:true})); });
              await page.keyboard.press('Escape');
              await page.evaluate(() => window.searchClosed);
              assert(await search.evaluate(e => document.activeElement === e));

            }
            // Each language has its own full-height target and native navigation.
            const language = page.locator(`.language-picker a[data-language="${locale ? 'nb' : 'en'}"]`);
            await language.focus();
            assert(await language.evaluate(e => e.matches(':focus-visible')));
            await language.click({position:{x:22,y:1}});
            await page.waitForURL(url => locale ? !url.pathname.startsWith('/en/') : url.pathname.startsWith('/en/'));
            assert.equal(await page.locator('.language-picker [aria-current=true]').getAttribute('data-language'),locale ? 'nb' : 'en');
            assert(await page.locator('.nav-account').evaluate(e => !!e.getAttribute('href')));
          }
          results.push({browser:name,width,zoom,locales:['nb','en'],themes:['original','readable','contrast'],status:'passed'});
          console.log(`Passed: ${name}, ${width}px, ${zoom*100}% reflow, NB/EN, all themes, targets, focus, search, disclosure and language navigation`);
          await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally {
    fs.mkdirSync('test-results', {recursive:true});
    fs.writeFileSync('test-results/navigation-v11-results.json', JSON.stringify(results,null,2)+'\n');
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

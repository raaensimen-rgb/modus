'use strict';
// Verify the generated public homepage contract, in both languages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const {parse} = await import('parse5');
  const walk = (node, result=[]) => { result.push(node); for (const child of node.childNodes || []) walk(child,result); return result; };
  const attr = (node,key) => node.attrs?.find(a=>a.name===key)?.value;
  const hasClass = (node,cls) => (attr(node,'class')||'').split(/\s+/).includes(cls);
  const text = node => (node.value || '') + (node.childNodes || []).map(text).join('');
  for (const locale of ['', 'en/']) {
    const base = path.join('dist',locale);
    const source = fs.readFileSync(path.join(base,'index.html'),'utf8');
    const nodes = walk(parse(source));
    assert.equal(nodes.filter(n=>n.tagName==='h1').length,1);
    assert.equal(nodes.filter(n=>n.tagName==='main').length,1);
    assert(nodes.some(n=>attr(n,'href')==='#main' && text(n).trim()===(locale?'Skip to content':'Hopp til innhold')));
    const portals = nodes.filter(n=>hasClass(n,'home-portal'));
    assert.deepEqual(portals.map(n=>attr(n,'href')),['laeringssti.html','backingtracks.html','musikkart.html','artikler.html']);
    for (const portal of portals) assert(fs.existsSync(path.join(base,attr(portal,'href'))));
    const hero = nodes.find(n=>hasClass(n,'hero-actions'));
    assert.deepEqual(walk(hero).filter(n=>n.tagName==='a').map(n=>attr(n,'href')),['laer-dorisk.html','laeringssti.html']);
    assert.equal(text(nodes.find(n=>attr(n,'id')==='why-modus')).replace(/\s/g,''),locale?'WhyMODUS?':'HvorforMODUS?');
    assert(text(nodes.find(n=>n.tagName==='h1')).includes(locale?'creative joy.':'skaperglede.'));
    assert(nodes.some(n=>attr(n,'data-intro-film-open')!==undefined));
    // Production imagery is original vector geometry and the existing landscape.
    for (const img of nodes.filter(n=>n.tagName==='img')) {
      assert(attr(img,'alt')!==undefined, 'Every image needs alternative text or explicit decorative alt');
      assert(!attr(img,'src').includes('design-references'));
      assert(fs.existsSync(path.join(base,attr(img,'src'))));
    }
    assert(/href="home-2\.[a-f0-9]{10}\.css"/.test(source),'Homepage style must be content-addressed');
    assert(source.includes('href="/redaktor.html"'));
    assert.equal(JSON.parse(fs.readFileSync('dist/cms-seed.json')).length,68,'CMS seed contains only owner-selected NB/EN versions');
    assert.equal(JSON.parse(fs.readFileSync(path.join(base,'search-index.json'))).filter(x=>x.type==='article').length,base.includes('/en')?16:52);
  }
  assert(!fs.existsSync('dist/design-references'), 'Design references must never ship');
  console.log('MODUS 2.0 homepage: both languages, real routes, landmarks, assets and private-content boundary passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});

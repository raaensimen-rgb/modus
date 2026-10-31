import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import * as model from '../src/model.js';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = (await readFile(new URL('../src/main.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const articles = JSON.parse(await readFile(new URL('../../content/articles.json', import.meta.url), 'utf8'));
const tick = () => new Promise(resolve => setImmediate(resolve));
async function editor(data = articles) {
  const dom = new JSDOM(html, {runScripts:'outside-only', url:'http://studio.local'});
  const {window:w} = dom; let saved, nextOpen = {path:'articles.json', content:JSON.stringify(data)}, saveResult = 'new-copy.json';
  w.confirm = () => true; w.__model = model;
  w.invoke = async (name, args) => { if (name === 'open_articles') return nextOpen; saved = args.content; return typeof saveResult === 'function' ? saveResult() : saveResult; };
  w.eval('const {validArticles, validSections, serializeArticles, articleMatches, levelLabel, localeLabel} = window.__model;\n' + source);
  const $ = id => w.document.getElementById(id);
  const input = (element, value) => { element.value = value; element.dispatchEvent(new w.Event('input', {bubbles:true})); };
  $('open').click(); await tick();
  return {w,$,input,get saved(){return saved;},set openResult(value){nextOpen=value;},set saveResult(value){saveResult=value;},close:()=>w.close()};
}
test('real article data round-trips losslessly and ends with an actual newline', () => {
  const serialized = model.serializeArticles(structuredClone(articles));
  assert.deepEqual(JSON.parse(serialized), articles); assert.ok(serialized.endsWith('\n'));
});
test('model rejects malformed sections and duplicate identifiers', () => {
  assert.throws(() => model.validSections([['Title']])); assert.throws(() => model.validSections([[4,'Text']]));
  assert.throws(() => model.validArticles([articles[0], articles[0]]), /Duplisert/);
});
test('cards show every complete title, description, level, language and selected state', async () => {
  const e = await editor();
  try {
    const cards = [...e.$('articleList').querySelectorAll('button')]; assert.equal(cards.length, articles.length);
    assert.equal(cards[0].querySelector('strong').textContent, articles[0].title);
    assert.ok(cards[0].querySelector('.article-description').textContent.includes(articles[0].intro.slice(0,20)));
    assert.match(cards[0].querySelector('.article-meta').textContent, /Nybegynner · Norsk/);
    assert.equal(cards[0].getAttribute('aria-pressed'), 'true'); assert.ok(e.$('slug').readOnly);
    assert.equal(e.$('slug').value, articles[0].slug);
  } finally {e.close();}
});
test('search and level filter compose; no-match state and clearing work', async () => {
  const e=await editor(); try {
    e.input(e.$('articleSearch'), articles[0].slug);
    assert.equal(e.$('articleList').children.length,1);
    e.w.document.querySelector('[data-filter="advanced"]').click();
    assert.equal(e.$('articleList').children.length,0); assert.equal(e.$('emptyList').hidden,false);
    e.w.document.querySelector('[data-filter="all"]').click(); e.input(e.$('articleSearch'),'');
    assert.equal(e.$('articleList').children.length,articles.length);
  } finally {e.close();}
});
test('metadata editing survives article switching; unknown and English fields are preserved', async () => {
  const data=structuredClone(articles); data[0].extra={nested:['preserve']}; data[0].locale='en';
  const e=await editor(data); try {
    assert.match(e.$('articleList').firstElementChild.textContent,/Engelsk/);
    e.input(e.$('title'),'Updated title'); e.input(e.$('intro'),'New intro');
    e.$('articleList').children[1].click(); e.$('articleList').children[0].click();
    assert.equal(e.$('title').value,'Updated title'); assert.match(e.$('dirtyState').textContent,/Ulagrede/);
    e.$('save').click(); await tick(); const result=JSON.parse(e.saved);
    assert.deepEqual(result[0],{...data[0],title:'Updated title',intro:'New intro'}); assert.deepEqual(result.slice(1),data.slice(1));
    assert.doesNotMatch(e.$('dirtyState').textContent,/Ulagrede/);
  } finally {e.close();}
});
test('section editing, jump navigation and formatting keep [heading, HTML] tuples', async () => {
  const e=await editor(); try {
    const original=structuredClone(articles[0].sections);
    const body=e.$('section-body-0'); e.input(body,'text'); body.setSelectionRange(0,4);
    e.w.document.querySelector('.format-toolbar button:nth-child(2)').click();
    assert.equal(body.value,'<strong>text</strong>');
    e.input(e.$('section-title-0'),'New heading');
    e.$('sectionNav').lastElementChild.click(); assert.equal(e.w.document.activeElement.id,'section-title-'+(original.length-1));
    e.$('save').click(); await tick(); const sections=JSON.parse(e.saved)[0].sections;
    assert.deepEqual(sections[0],['New heading','<strong>text</strong>']); assert.deepEqual(sections.slice(1),original.slice(1));
  } finally {e.close();}
});
test('invalid advanced JSON blocks save and article switch, retains dirty draft', async () => {
  const e=await editor(); try {
    e.input(e.$('sections'),'[broken'); e.$('articleList').children[1].click(); assert.equal(e.$('slug').value,articles[0].slug);
    e.$('save').click(); await tick(); assert.equal(e.saved,undefined); assert.match(e.$('status').textContent,/Lagring feilet/);
    assert.match(e.$('dirtyState').textContent,/Ulagrede/);
  } finally {e.close();}
});
test('add/remove sections is explicit and does not mutate other articles', async () => {
  const e=await editor(); try {
    const count=articles[0].sections.length; e.$('addSection').click(); assert.equal(e.$('sectionCards').children.length,count+1);
    e.$('sectionCards').lastElementChild.querySelector('button').click(); assert.equal(e.$('sectionCards').children.length,count);
    e.$('save').click(); await tick(); assert.deepEqual(JSON.parse(e.saved),articles);
  } finally {e.close();}
});
test('cancelled or failed save never clears unsaved status', async () => {
  const e=await editor(); try {
    e.input(e.$('title'),'Keep draft'); e.saveResult=null; e.$('save').click(); await tick(); assert.match(e.$('status').textContent,/avbrutt/);
    assert.match(e.$('dirtyState').textContent,/Ulagrede/);
    e.saveResult=()=>Promise.reject(Error('disk full')); e.$('save').click(); await tick(); assert.match(e.$('status').textContent,/Lagring feilet/);
    assert.match(e.$('dirtyState').textContent,/Ulagrede/); assert.equal(e.$('title').value,'Keep draft');
  } finally {e.close();}
});
test('edits made during save stay dirty after the older snapshot is exported', async () => {
  const e=await editor(); try {
    e.input(e.$('title'),'First'); let resolve; e.saveResult=()=>new Promise(r=>resolve=r);
    e.$('save').click(); e.input(e.$('title'),'Second'); resolve('copy.json'); await tick();
    assert.equal(JSON.parse(e.saved)[0].title,'First'); assert.match(e.$('dirtyState').textContent,/Ulagrede/); assert.match(e.$('status').textContent,/Nyere/);
  } finally {e.close();}
});
test('invalid or cancelled import retains the current draft; rejected discard never opens a file', async () => {
  const e=await editor(); try {
    e.input(e.$('title'),'Draft'); e.openResult={path:'invalid.json',content:'invalid'}; e.$('open').click(); await tick();
    assert.equal(e.$('title').value,'Draft'); assert.match(e.$('status').textContent,/Kunne ikke åpne/);
    e.openResult=null; e.$('open').click(); await tick(); assert.equal(e.$('title').value,'Draft');
    e.w.confirm=()=>false; e.openResult={path:'other.json',content:'[]'}; e.$('open').click(); await tick(); assert.equal(e.$('title').value,'Draft');
  } finally {e.close();}
});
test('empty imported list clears and disables stale editor content', async () => {
  const e=await editor(); try {
    e.openResult={path:'empty.json',content:'[]'}; e.$('open').click(); await tick();
    assert.equal(e.$('title').value,''); assert.equal(e.$('editorFields').disabled,true); assert.equal(e.$('preview').children.length,0);
    e.$('save').click(); await tick(); assert.deepEqual(JSON.parse(e.saved),[]);
  } finally {e.close();}
});
test('preview never interprets imported HTML or creates external/resource elements', async () => {
  const data=structuredClone(articles); data[0].sections=[['<img src=x>', '<script>alert(1)</script><img src="https://example.invalid/spy"><p>Safe text</p>']];
  const e=await editor(data); try {
    assert.equal(e.$('preview').querySelectorAll('script,img,iframe,a').length,0);
    assert.match(e.$('preview').textContent,/Safe text/); e.$('save').click(); await tick(); assert.deepEqual(JSON.parse(e.saved),data);
  } finally {e.close();}
});

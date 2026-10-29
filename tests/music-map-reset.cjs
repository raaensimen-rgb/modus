'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/musikkart.js', 'utf8');
const catalogue = JSON.parse(source.match(/const catalog=(\[.*?\]);\s*const groups=/s)?.[1] || 'null');
assert.equal(catalogue.length, 24, 'Expected all 24 curriculum modules');
const storeKey = 'modus-musikkart-v1';
const evidenceKey = 'modus.atlas.article-evidence.v1';
const quizKey = 'modus.article-quiz.v1.toner-og-intervaller';

function runPage(code, storage, allowReset = true) {
  const elements = new Map();
  class Element {
    constructor(id = '') {
      this.id = id; this.children = []; this.listeners = {};
      this.dataset = {}; this.className = ''; this.value = ''; this.checked = false;
      this.textContent = ''; this.hidden = false; this.style = {}; this.attributes = {};
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatch(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
    querySelectorAll(query) { return query === '[data-state]' ? [] : []; }
  }
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  const localStorage = {
    getItem: key => Object.hasOwn(storage, key) ? storage[key] : null,
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: key => { delete storage[key]; }
  };
  const window = { confirm: () => allowReset, addEventListener() {} };
  const document = {
    getElementById: get,
    createElementNS: (_ns, tag) => new Element(tag),
    createElement: tag => new Element(tag),
    addEventListener() {}
  };
  vm.runInNewContext(code, { document, window, localStorage, console, URL, Blob, setTimeout }, { timeout: 5000 });
  return { get, storage };
}
function seeded() {
  const records = Object.fromEntries(catalogue.map((m, i) => [m.id, {
    state: i % 2 ? 'exploring' : 'learned', manual: true,
    idea: true, note: 'Existing note ' + m.id
  }]));
  records._categories = { gehor: 'learned', gitar: 'exploring' };
  return {
    [storeKey]: JSON.stringify(records),
    [evidenceKey]: JSON.stringify({ 'toner-og-intervaller': { opened: true, passed: true } }),
    [quizKey]: 'passed',
    'other-user-data': 'leave untouched'
  };
}
function assertReset(code) {
  const storage = seeded();
  const previousEvidence = storage[evidenceKey];
  const previousQuiz = storage[quizKey];
  const cancelled = runPage(code, storage, false);
  cancelled.get('map-clear').dispatch('click');
  assert.deepEqual(JSON.parse(storage[storeKey]), JSON.parse(seeded()[storeKey]), 'Cancellation must not modify atlas');
  const page = runPage(code, storage, true);
  assert.equal(page.get('map-learned').textContent, 12, 'Seeded learned count');
  assert.equal(page.get('map-exploring').textContent, 12, 'Seeded exploring count');
  assert.equal(page.get('map-planned').textContent, 24, 'Seeded idea count');
  page.get('map-clear').dispatch('click');
  const reset = JSON.parse(storage[storeKey]);
  for (const m of catalogue) {
    assert.deepEqual(reset[m.id], { state: 'not-started', manual: true, idea: false, note: '' },
      'Reset must clear ' + m.id + ' and override imported quiz evidence');
  }
  assert.equal(Object.keys(reset).length, 25, '24 modules and one category bucket');
  for (const state of Object.values(reset._categories)) assert.equal(state, 'not-started');
  assert.equal(page.get('map-learned').textContent, 0, 'Learned counter after reset');
  assert.equal(page.get('map-exploring').textContent, 0, 'Exploring counter after reset');
  assert.equal(page.get('map-planned').textContent, 0, 'Idea counter after reset');
  assert.equal(storage[evidenceKey], previousEvidence, 'Article evidence must remain unchanged');
  assert.equal(storage[quizKey], previousQuiz, 'Quiz result must remain unchanged');
  assert.equal(storage['other-user-data'], 'leave untouched', 'Unrelated storage must remain unchanged');
  const reload = runPage(code, storage, true);
  assert.equal(reload.get('map-learned').textContent, 0, 'Reload learned counter');
  assert.equal(reload.get('map-exploring').textContent, 0, 'Reload exploring counter');
  assert.equal(reload.get('map-planned').textContent, 0, 'Reload idea counter');
  assert.deepEqual(JSON.parse(storage[storeKey]), reset, 'Reload must preserve reset records');
}
assertReset(source);
// Mutation check: deliberately prevent the reset click handler from clearing modules.
// The behavioural assertion MUST reject this broken implementation.
const broken = source.replace('for(const m of catalog)records[m.id]={state:"not-started",manual:true,idea:false,note:""};', '/* deliberately broken reset */');
assert.notEqual(broken, source, 'Mutation target must exist');
assert.throws(() => assertReset(broken), /Reset must clear/, 'Test must detect a broken reset');
console.log('Music atlas reset behaviour passed: 24 modules, notes, ideas, counters, reload, preserved quiz evidence, cancellation, mutation detection.');

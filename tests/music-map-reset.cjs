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

function runPage(code, storage, allowReset = true, blocked = {}) {
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
    querySelectorAll(query) {
      return this.id === 'inspector-module' && query === '[data-state]'
        ? ['not-started','exploring','learned'].map(state => {
          const button=get('state-'+state);button.dataset.state=state;return button;
        }) : [];
    }
  }
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  const localStorage = {
    getItem: key => { if(blocked.read)throw Error('Storage read denied');return Object.hasOwn(storage, key) ? storage[key] : null; },
    setItem: (key, value) => { if(blocked.write)throw Error('Storage write denied');storage[key] = String(value); },
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
  function selectModule(id) {
    function find(element) {
      if(element.attributes.class?.split(' ').includes('module-node') && element.attributes['aria-label']?.startsWith(id+' · '))return element;
      for(const child of element.children) { const match=find(child);if(match)return match; }
    }
    const node=find(get('music-map'));
    assert(node,'Module must be reachable in rendered SVG: '+id);
    node.dispatch('click');
  }
  return { get, storage, selectModule };
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
  const beforeCancel = {...storage};
  const cancelled = runPage(code, storage, false);
  cancelled.get('map-clear').dispatch('click');
  assert.deepEqual(JSON.parse(storage[storeKey]), JSON.parse(seeded()[storeKey]), 'Cancellation must not modify atlas');
  assert.deepEqual(storage,beforeCancel,'Cancellation must preserve every storage key');
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
  reload.get('map-clear').dispatch('click');
  assert.deepEqual(JSON.parse(storage[storeKey]),reset,'Repeated reset must preserve the reset state');
}
assertReset(source);

// Exercise the actual rendered node and controls, then reopen with the same store.
const saved={'other-user-data':'untouched'};
const edit=runPage(source,saved);
const moduleId=catalogue[0].id;
edit.selectModule(moduleId);
edit.get('state-learned').dispatch('click');
edit.get('map-personal-note').dispatch('input',{target:{value:'My practice note'}});
edit.get('course-idea').dispatch('change',{target:{checked:true}});
const persisted=JSON.parse(saved[storeKey]);
assert.deepEqual(persisted[moduleId],{state:'learned',manual:true,idea:true,note:'My practice note'});
assert.equal(edit.get('map-learned').textContent,1);
assert.equal(edit.get('map-planned').textContent,1);
const reopened=runPage(source,saved);reopened.selectModule(moduleId);
assert.equal(reopened.get('map-personal-note').value,'My practice note','Reload note');
assert.equal(reopened.get('course-idea').checked,true,'Reload idea');
assert.equal(reopened.get('state-learned').attributes['aria-pressed'],'true','Reload status control');
const beforeOverview={...saved};
reopened.get('map-reset').dispatch('click');
assert.deepEqual(saved,beforeOverview,'Return to overview must not erase learning data');
assert.equal(saved['other-user-data'],'untouched');

// Corrupt data and denied storage must not prevent using the map in memory.
const corrupt={[storeKey]:'{invalid JSON',[evidenceKey]:'{invalid JSON'};
const fallback=runPage(source,corrupt);
assert.equal(fallback.get('map-learned').textContent,0,'Corrupt data must fall back safely');
assert.equal(corrupt[storeKey],'{invalid JSON','Loading must not overwrite corrupt saved data');
const deniedData=seeded(),beforeDenied={...deniedData};
const denied=runPage(source,deniedData,true,{read:true,write:true});
denied.selectModule(moduleId);denied.get('state-exploring').dispatch('click');
assert.equal(denied.get('map-exploring').textContent,1,'Denied storage must allow in-memory edits');
assert(denied.get('map-save-status').textContent.includes('tillot ikke lagring'),'Explain failed persistence');
assert.deepEqual(deniedData,beforeDenied,'Denied storage must not modify saved data');
const failedWrite=runPage(source,saved,true,{write:true}),beforeWrite={...saved};
failedWrite.get('map-clear').dispatch('click');
assert.equal(failedWrite.get('map-learned').textContent,0,'Reset can update visible in-memory state');
assert(failedWrite.get('map-save-status').textContent.includes('tillot ikke lagring'));
assert.deepEqual(saved,beforeWrite,'Failed reset save must preserve persisted records');
// Mutation check: deliberately prevent the reset click handler from clearing modules.
// The behavioural assertion MUST reject this broken implementation.
const broken = source.replace('for(const m of catalog)records[m.id]={state:"not-started",manual:true,idea:false,note:""};', '/* deliberately broken reset */');
assert.notEqual(broken, source, 'Mutation target must exist');
assert.throws(() => assertReset(broken), /Reset must clear/, 'Test must detect a broken reset');
console.log('Music atlas behaviour passed: edit/save/reopen, overview vs reset, 24 modules, notes, ideas, counters, preserved quiz evidence, cancellation, repeated reset, corrupt/denied storage and mutation detection.');

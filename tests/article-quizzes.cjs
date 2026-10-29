'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {grade, progress, IDS} = require('../dist/article-quiz.js');
const articles = require('../content/articles.json');
const quizzes = require('../content/article-quizzes.json');
assert.deepEqual(IDS.slice().sort(), articles.map(a=>a.slug).sort());
for (const article of articles) {
  const qs=quizzes[article.slug];
  assert.equal(qs.length,3);
  for (const q of qs) {
    assert.equal(q.options.length,3); assert.equal(new Set(q.options).size,3);
    assert.equal(q.en.options.length,3); assert(q.en.question && q.en.explanation);
    assert(Number.isInteger(q.answer) && q.answer>=0 && q.answer<3);
    assert(q.section>0 && q.section<=article.sections.length);
  }
  const key=qs.map(q=>q.answer);
  assert.equal(grade(key,key).passed,true);
  assert.equal(grade(key.map(a=>(a+1)%3),key).score,0);
  assert.equal(grade([null,...key.slice(1)],key).passed,false);
  for (const lang of (['kirketonearter-ett-system-sju-uttrykk','romertall-i-musikk'].includes(article.slug) ? [''] : ['', 'en/'])) {
    const page=fs.readFileSync(`dist/${lang}artikler/${article.slug}.html`,'utf8');
    assert.equal((page.match(/<fieldset data-answer=/g)||[]).length,3);
    assert.equal((page.match(/type="radio" name="q[0-2]"/g)||[]).length,9);
    assert(page.includes(`data-quiz-id="${article.slug}"`));
  }
}
const englishPreview=fs.readFileSync('dist/en/artikler/kirketonearter-ett-system-sju-uttrykk.html','utf8');
assert(englishPreview.includes('Full lesson available in Norwegian'));
assert(englishPreview.includes('../../artikler/kirketonearter-ett-system-sju-uttrykk.html'));
const romanPreview=fs.readFileSync('dist/en/artikler/romertall-i-musikk.html','utf8');
assert(romanPreview.includes('Full lesson available in Norwegian'));
assert(romanPreview.includes('../../artikler/romertall-i-musikk.html'));
const data=new Map(), storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
const a=progress(storage), b=progress(storage);
assert.equal(a.has(IDS[0]),false); assert.equal(a.pass(IDS[0]),true);
assert.equal(b.has(IDS[0]),true); assert.equal(b.has(IDS[1]),false);
assert.equal(a.pass('unknown'),false);
const blocked=progress({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
assert.equal(blocked.has(IDS[0]),false); assert.equal(blocked.pass(IDS[0]),false); assert.equal(blocked.has(IDS[0]),true);
assert.equal(progress(null).has(IDS[0]),false);
console.log('Passed: article quizzes and new Norwegian modes lesson, article references, grading, persistent shared completion and blocked-storage fallback.');

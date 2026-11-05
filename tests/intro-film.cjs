'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sha='81eed15e5f0fa3c43ef0ba3130162bed23564621d68a9c96cf8f2fefcf4359b4';
assert.equal(digest('dist/media/modus-intro-81eed15e5f0f.mp4'),sha,'Only the exact owner-approved version may be enabled');
for(const pre of ['','en/']){const html=fs.readFileSync('dist/'+pre+'index.html','utf8');assert.equal((html.match(/data-intro-film-open/g)||[]).length,1);assert(!html.includes('film-unavailable'));const js=fs.readFileSync('dist/'+pre+'intro-film.js','utf8');assert(js.includes('preload="none"'));assert(!js.includes('autoplay'));assert(js.includes('/media/modus-intro-81eed15e5f0f.mp4'));assert(js.includes('intro-film-transcript'));assert(!js.includes('src="/media/modus-introduksjon.mp4"'));}
console.log('Approved film: exact approved SHA, working NB/EN triggers, no autoplay, transcript and retired-version exclusion passed. Browser tests cover playback, keyboard and focus.');

 'use strict';
// Reuse the existing real-signal public matrix, but make failures a strict gate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve('test-results/audio-baseline-results.json');fs.rmSync(output,{force:true});
process.env.MODUS_AUDIO_BASELINE_ONLY='1';process.env.MODUS_AUDIO_BASELINES='https://modus-4ye.pages.dev';
require('./audio-signal-browser.cjs');
process.once('beforeExit',()=>{try{const rows=JSON.parse(fs.readFileSync(output));assert.equal(rows.length,8);assert(rows.every(r=>r.status==='passed'),'Public audio regression');}catch(e){console.error(e);process.exitCode=1;}});

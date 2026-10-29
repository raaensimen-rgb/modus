'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

// Keep the original npm test sequence unchanged; failures never skip later tests.
const tests = [
  [
    "python3",
    "tests/site-structure.py"
  ],
  [
    "node",
    "tests/languages.cjs"
  ],
  [
    "node",
    "--check",
    "dist/undervisning.js"
  ],
  [
    "node",
    "--check",
    "dist/f03-atelier.js"
  ],
  [
    "node",
    "tests/f03-atelier.cjs"
  ],
  [
    "node",
    "tests/navigation.cjs"
  ],
  [
    "node",
    "tests/membership.cjs"
  ],
  [
    "node",
    "tests/subscription-dormancy.cjs"
  ],
  [
    "node",
    "tests/chord-playback.cjs"
  ],
  [
    "node",
    "tests/chord-analysis.cjs"
  ],
  [
    "node",
    "tests/progression-integration.cjs"
  ],
  [
    "node",
    "tests/article-quizzes.cjs"
  ],
  [
    "node",
    "tests/article-library.cjs"
  ],
  [
    "node",
    "tests/account-state.cjs"
  ],
  [
    "node",
    "tests/article-editor.mjs"
  ],
  [
    "python3",
    "tests/design-system.py"
  ],
  [
    "python3",
    "tests/curriculum.py"
  ],
  [
    "node",
    "--check",
    "dist/musikkart.js"
  ],
  [
    "python3",
    "tests/music-map.py"
  ],
  [
    "node",
    "tests/feedback.cjs"
  ],
  [
    "node",
    "tests/stripe-test.mjs"
  ],
  [
    "node",
    "tests/usage-billing.mjs"
  ]
];
const outputDir = path.join(process.cwd(), 'test-results');
fs.mkdirSync(outputDir, { recursive: true });
const results = [];
for (let i = 0; i < tests.length; i++) {
  const [command, ...args] = tests[i];
  const label = [command, ...args].join(' ');
  const start = performance.now();
  let run;
  try {
    run = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, shell: false });
  } catch (error) {
    run = { status: null, error, stdout: '', stderr: '' };
  }
  const exitCode = run.error ? (run.status ?? 1) : (run.status ?? (run.signal ? 1 : 1));
  const stdout = run.stdout || '';
  const stderr = run.stderr || '';
  const errorMessage = run.error?.message || (exitCode !== 0 ? (stderr.trim().split('\n').slice(-8).join('\n') || stdout.trim().split('\n').slice(-8).join('\n') || (run.signal ? 'Terminated by ' + run.signal : 'Process exited with code ' + exitCode)) : null);
  const result = { number: i + 1, command: label, status: exitCode === 0 ? 'passed' : 'failed', exitCode, durationMs: Math.round(performance.now() - start), errorMessage, stdout, stderr };
  results.push(result);
  console.log('[' + result.number + '/' + tests.length + '] ' + result.status.toUpperCase() + ' (' + result.exitCode + ', ' + result.durationMs + ' ms): ' + label);
  if (exitCode !== 0) console.error(errorMessage);
}
const passed = results.filter(r => r.status === 'passed').length;
const failed = results.length - passed;
const summary = { generatedAt: new Date().toISOString(), total: results.length, passed, failed, results };
fs.writeFileSync(path.join(outputDir, 'test-results.json'), JSON.stringify(summary, null, 2) + '\n');
const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const lines = ['# MODUS test results', '', 'Passed: ' + passed + ' / ' + tests.length + ' · Failed: ' + failed, '', '| # | Command | Result | Exit code | Duration (ms) | Error |', '|---:|---|---|---:|---:|---|'];
for (const result of results) lines.push('| ' + result.number + ' | `' + cell(result.command) + '` | ' + result.status + ' | ' + result.exitCode + ' | ' + result.durationMs + ' | ' + cell(result.errorMessage) + ' |');
fs.writeFileSync(path.join(outputDir, 'test-results.md'), lines.join('\n') + '\n');
console.log('Completed all ' + tests.length + ' tests: ' + passed + ' passed, ' + failed + ' failed.');
process.exitCode = failed ? 1 : 0;

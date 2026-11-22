(function () {
  'use strict';

  const workspace = document.querySelector('[data-modus-tool="fretboard"] .tool-panel');
  if (!workspace) return;

  const controls = workspace.querySelector('#tool-controls');
  const [root, scale, noteSet, display, frets] = controls.querySelectorAll('select');
  const [showAll, arpeggio, isolate, practice, fullscreen] = controls.querySelectorAll('button');
  const board = workspace.querySelector('#fretboard-scroll');
  const toneSet = workspace.querySelector('#tone-set');
  const context = workspace.querySelector('#fret-context');
  const legend = workspace.querySelector('.tool-legend');
  const status = workspace.querySelector('#tool-status');
  const english = document.documentElement.lang === 'en';
  const t = (nb, en) => english ? en : nb;

  function group(title, ...items) {
    const fieldset = document.createElement('fieldset');
    const heading = document.createElement('legend');
    fieldset.className = 'fretboard-settings';
    heading.textContent = title;
    fieldset.append(heading, ...items);
    return fieldset;
  }

  const tuning = document.createElement('p');
  tuning.textContent = window.ModusTools.open
    .map(midi => window.ModusTools.roots[midi % 12])
    .join(' · ');

  // Keep the original select order and move the live controls with their listeners.
  controls.append(
    group(t('Skala', 'Scale'), root.parentElement, scale.parentElement, isolate),
    group(t('Akkord og arpeggio', 'Chord and arpeggio'), noteSet.parentElement, arpeggio),
    group(t('Visning', 'View'), display.parentElement, frets.parentElement, showAll, practice, fullscreen),
    group(t('Stemming', 'Tuning'), tuning)
  );

  const skip = document.createElement('a');
  skip.className = 'fretboard-skip';
  skip.href = '#tool-controls';
  skip.textContent = t('Hopp til innstillinger', 'Skip to settings');
  skip.addEventListener('click', event => {
    event.preventDefault();
    root.focus();
  });
  board.before(skip);

  const scrollHint = document.createElement('p');
  scrollHint.className = 'fretboard-scroll-hint';
  scrollHint.textContent = t('Rull vannrett for flere bånd.', 'Scroll horizontally for more frets.');

  const notes = document.createElement('div');
  notes.className = 'fretboard-notes';
  notes.append(toneSet, legend, context, status);
  board.after(scrollHint, notes, controls);
  workspace.classList.add('fretboard-layout');
}());

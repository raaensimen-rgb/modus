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
    const card = document.createElement('div');
    const fieldset = document.createElement('fieldset');
    const heading = document.createElement('legend');
    card.className = 'fretboard-settings-card';
    fieldset.className = 'fretboard-settings';
    heading.textContent = title;
    fieldset.append(heading, ...items);
    card.append(fieldset);
    return card;
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

  const scaleSummary = document.createElement('section');
  const scaleTitle = document.createElement('h3');
  const scaleLabel = document.createElement('span');
  const scaleName = document.createElement('strong');
  const scaleDegrees = document.createElement('ul');
  scaleSummary.className = 'fretboard-scale-summary';
  scaleSummary.setAttribute('aria-labelledby', 'fretboard-scale-title');
  scaleTitle.id = 'fretboard-scale-title';
  scaleLabel.textContent = t('Skala', 'Scale');
  scaleDegrees.setAttribute('aria-label', t('Skalaformel og toner', 'Scale formula and notes'));
  scaleTitle.append(scaleLabel, scaleName);
  scaleSummary.append(scaleTitle, scaleDegrees);

  function updateScaleSummary() {
    const tonic = root.value;
    const mode = scale.value;
    const name = scale.selectedOptions[0].textContent;
    scaleName.textContent = mode === 'ionian'
      ? t(tonic + '-dur (ionisk)', tonic + ' major (Ionian)')
      : mode === 'major' ? t(tonic + '-dur', tonic + ' major') : tonic + ' ' + name;

    scaleDegrees.replaceChildren(...window.ModusTools.scale(tonic, mode).map(tone => {
      const tile = document.createElement('li');
      const degree = document.createElement('strong');
      const note = document.createElement('span');
      tile.classList.toggle('is-tonic', tone.root);
      degree.textContent = tone.degree;
      note.textContent = tone.name;
      tile.append(degree, note);
      return tile;
    }));
  }

  root.addEventListener('change', updateScaleSummary);
  scale.addEventListener('change', updateScaleSummary);
  updateScaleSummary();

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
  board.after(scrollHint, notes, controls, scaleSummary);
  workspace.classList.add('fretboard-layout');
}());

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
    const label = document.createElement('span');
    label.textContent = title;
    heading.append(label);
    fieldset.append(heading, ...items);
    card.append(fieldset);
    return card;
  }

  const tuning = document.createElement('p');
  tuning.textContent = window.ModusTools.open
    .map(midi => window.ModusTools.roots[midi % 12])
    .join(' · ');

  const viewActions = document.createElement('div');
  viewActions.className = 'fretboard-view-actions';
  viewActions.append(showAll, practice, fullscreen);

  // Keep the original select order and move the live controls with their listeners.
  controls.append(
    group(t('Skala', 'Scale'), root.parentElement, scale.parentElement, isolate),
    group(t('Akkord og arpeggio', 'Chord and arpeggio'), noteSet.parentElement, arpeggio),
    group(t('Visning', 'View'), display.parentElement, frets.parentElement, viewActions),
    group(t('Stemming', 'Tuning'), tuning)
  );

  function summaryRow(id, label, listLabel) {
    const section = document.createElement('section');
    const title = document.createElement('h3');
    const caption = document.createElement('span');
    const name = document.createElement('strong');
    const list = document.createElement('ul');
    section.className = 'fretboard-scale-summary';
    section.setAttribute('aria-labelledby', id);
    title.id = id;
    caption.textContent = label;
    list.setAttribute('aria-label', listLabel);
    title.append(caption, name);
    section.append(title, list);
    return { section, name, list };
  }

  function summaryTile(degree, text, tonic) {
    const tile = document.createElement('li');
    const heading = document.createElement('strong');
    const value = document.createElement('span');
    tile.classList.toggle('is-tonic', tonic);
    heading.textContent = degree;
    value.textContent = text;
    tile.append(heading, value);
    return tile;
  }

  const scaleSummary = summaryRow('fretboard-scale-title', t('Skala', 'Scale'),
    t('Skalaformel og toner', 'Scale formula and notes'));
  const chordSummary = summaryRow('fretboard-chords-title', t('Akkorder', 'Chords'),
    t('Romertall og akkordnavn', 'Roman numerals and chord names'));
  chordSummary.name.textContent = t('Treklanger', 'Triads');

  function updateScaleSummary() {
    const model = window.ModusTools;
    const tonic = root.value;
    const mode = scale.value;
    const name = scale.selectedOptions[0].textContent;
    scaleSummary.name.textContent = mode === 'ionian'
      ? t(tonic + '-dur (ionisk)', tonic + ' major (Ionian)')
      : mode === 'major' ? t(tonic + '-dur', tonic + ' major') : tonic + ' ' + name;

    const tones = model.scale(tonic, mode);
    scaleSummary.list.replaceChildren(...tones.map(tone =>
      summaryTile(tone.degree, tone.name, tone.root)));
    chordSummary.list.replaceChildren(...tones.map((tone, index) => {
      const intervals = [0, 2, 4].map(step => model.mod(tones[(index + step) % tones.length].pc - tone.pc));
      const quality = ['maj', 'min', 'dim', 'aug'].find(id =>
        model.qualities[id][3].every((interval, position) => interval === intervals[position]));
      const [suffix] = model.qualities[quality];
      const { roman } = model.analyze({root: model.roots[tone.pc], quality}, tonic, mode);
      return summaryTile(roman, tone.name + suffix, tone.root);
    }));
  }

  function updateToneSetVisibility() {
    toneSet.hidden = noteSet.value === 'scale';
  }

  root.addEventListener('change', updateScaleSummary);
  scale.addEventListener('change', updateScaleSummary);
  noteSet.addEventListener('change', updateToneSetVisibility);
  updateScaleSummary();
  updateToneSetVisibility();

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
  notes.append(scaleSummary.section, chordSummary.section, toneSet, legend, context, status);
  board.after(scrollHint, notes, controls);
  workspace.classList.add('fretboard-layout');
}());

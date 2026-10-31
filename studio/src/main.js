import { invoke } from '@tauri-apps/api/core';
import { validArticles, validSections, serializeArticles, articleMatches, levelLabel, localeLabel } from './model.js';
import './style.css';
const $ = id => document.getElementById(id);
let articles = [], current = -1, dirty = false, activeFilter = 'all', revision = 0;
function status(message) { $('status').textContent = message; }
function dirtyIndicator() {
  $('dirtyState').textContent = dirty ? '● Ulagrede endringer' : 'Ingen ulagrede endringer';
  $('dirtyState').classList.toggle('is-dirty', dirty);
  document.title = (dirty ? '● ' : '') + 'MODUS Studio';
}
function plainText(html) {
  // Never parse imported markup into a live document or execute external content.
  return html.replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').trim();
}
function renderList() {
  const list = $('articleList'), focused = document.activeElement?.dataset.article;
  list.replaceChildren();
  let visible = 0;
  articles.forEach((article, index) => {
    if (!articleMatches(article, $('articleSearch').value, activeFilter)) return;
    visible++;
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'article-card'; card.dataset.article = String(index);
    card.setAttribute('aria-pressed', String(index === current));
    const title = document.createElement('strong'); title.textContent = article.title || 'Uten tittel';
    const description = document.createElement('span'); description.className = 'article-description'; description.textContent = plainText(article.intro) || 'Ingen beskrivelse';
    const meta = document.createElement('span'); meta.className = 'article-meta'; meta.textContent = levelLabel(article.level) + ' · ' + localeLabel(article.locale);
    const selected = document.createElement('span'); selected.className = 'article-selection'; selected.textContent = index === current ? '✓ Valgt artikkel' : 'Åpne artikkel →';
    card.append(title, description, meta, selected);
    card.addEventListener('click', () => choose(index)); list.append(card);
  });
  $('articleCount').textContent = visible + ' av ' + articles.length;
  $('emptyList').hidden = visible > 0;
  $('emptyList').textContent = articles.length ? 'Ingen artikler samsvarer med søket og nivåfilteret.' : 'Ingen artikler. Åpne en artikkel-JSON.';
  // Refreshing metadata must not discard keyboard focus on an existing card.
  if (focused !== undefined) list.querySelector(`[data-article="${focused}"]`)?.focus({preventScroll:true});
}
function commitFields() {
  if (current < 0) return;
  const sections = validSections(JSON.parse($('sections').value));
  const article = articles[current];
  article.title = $('title').value; article.intro = $('intro').value; article.sections = sections;
  validArticles(articles);
}
function preview() {
  const container = $('preview'); container.replaceChildren();
  if (current < 0) return;
  const heading = document.createElement('h3'); heading.textContent = $('title').value;
  const intro = document.createElement('p'); intro.textContent = plainText($('intro').value);
  container.append(heading, intro);
  try {
    for (const [head, html] of validSections(JSON.parse($('sections').value))) {
      const h = document.createElement('h4'); h.textContent = head;
      const text = document.createElement('p'); text.textContent = plainText(html); container.append(h, text);
    }
  } catch { const warn = document.createElement('p'); warn.textContent = 'Rett seksjonsdataene for å forhåndsvise innholdet.'; container.append(warn); }
}
function choose(index) {
  try { commitFields(); } catch (error) { status('Rett seksjonene før du bytter: ' + error.message); return; }
  current = index;
  const article = articles[index];
  $('editorFields').disabled = false;
  $('slug').value = article.slug; $('articleLocale').value = localeLabel(article.locale);
  $('title').value = article.title; $('intro').value = article.intro; $('sections').value = JSON.stringify(article.sections, null, 2);
  renderList(); renderSectionCards(); preview();
  // Update aria state without moving focus away from the selected card.
  $('articleList').querySelector(`[data-article="${index}"]`)?.focus({preventScroll:true});
}
function changed() {
  dirty = true; revision++; dirtyIndicator();
  try { commitFields(); status('Ulagrede endringer – velg «Lagre kopi…» for å eksportere.'); }
  catch (error) { status('Ulagrede endringer. Rett seksjonsdataene før eksport: ' + error.message); }
  preview();
}
for (const id of ['title', 'intro']) {
  $(id).addEventListener('input', changed);
  $(id).addEventListener('change', renderList);
}
$('sections').addEventListener('input', () => { renderSectionCards(); changed(); });
$('articleSearch').addEventListener('input', renderList);
for (const chip of document.querySelectorAll('[data-filter]')) chip.addEventListener('click', () => {
  activeFilter = chip.dataset.filter;
  for (const other of document.querySelectorAll('[data-filter]')) {
    other.classList.toggle('active', other === chip); other.setAttribute('aria-pressed', String(other === chip));
  }
  renderList();
});
$('open').addEventListener('click', async () => {
  if (dirty && !confirm('Ulagrede endringer vil gå tapt. Fortsette?')) return;
  const startedRevision = revision; $('open').disabled = true;
  try {
    const result = await invoke('open_articles'); if (!result) return;
    const data = validArticles(JSON.parse(result.content));
    if (revision !== startedRevision && dirty && !confirm('Du har redigert mens filen ble valgt. Erstatt ulagrede endringer?')) return;
    articles = data; current = -1; dirty = false; revision++;
    $('filename').textContent = result.path; $('save').disabled = false;
    $('articleSearch').value = ''; activeFilter = 'all';
    for (const chip of document.querySelectorAll('[data-filter]')) { const active = chip.dataset.filter === 'all'; chip.classList.toggle('active', active); chip.setAttribute('aria-pressed', String(active)); }
    for (const id of ['slug','articleLocale','title','intro','sections']) $(id).value = '';
    $('editorFields').disabled = true; $('sectionCards').replaceChildren(); $('sectionNav').replaceChildren(); $('preview').replaceChildren();
    renderList(); if (data.length) choose(0);
    dirtyIndicator(); status(data.length + ' artikler åpnet lokalt. Kilden er uendret.');
  } catch (error) { status('Kunne ikke åpne fil: ' + error); }
  finally { $('open').disabled = false; }
});
$('save').addEventListener('click', async () => {
  $('save').disabled = true;
  try {
    commitFields(); const content = serializeArticles(articles), savedRevision = revision;
    const saved = await invoke('save_articles_copy', {content});
    if (saved) {
      if (savedRevision === revision) dirty = false;
      dirtyIndicator(); status('Kopi lagret: ' + saved + (dirty ? ' · Nyere endringer er fortsatt ulagret.' : ''));
    } else status(dirty ? 'Lagring avbrutt. Endringene er fortsatt ulagret.' : 'Lagring avbrutt.');
  } catch (error) { status('Lagring feilet. Endringene er beholdt: ' + error); }
  finally { $('save').disabled = false; }
});
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
function renderSectionNav() {
  const nav = $('sectionNav'); nav.replaceChildren();
  document.querySelectorAll('.section-card').forEach((card, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'section-jump';
    button.textContent = (index + 1) + '. ' + (card.querySelector('input').value || 'Uten overskrift');
    button.addEventListener('click', () => { card.querySelector('input').focus(); }); nav.append(button);
  });
}
function renderSectionCards() {
  const parent = $('sectionCards'); parent.replaceChildren(); $('sectionNav').replaceChildren();
  if (current < 0) return;
  let blocks; try { blocks = validSections(JSON.parse($('sections').value)); } catch { return; }
  blocks.forEach((item, index) => {
    const card = document.createElement('section'); card.className = 'section-card';
    const bar = document.createElement('div'); bar.className = 'section-card-head';
    const heading = document.createElement('h4'); heading.textContent = 'Seksjon ' + (index + 1);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'section-remove'; remove.textContent = 'Fjern'; remove.setAttribute('aria-label', 'Fjern seksjon ' + (index + 1)); remove.disabled = blocks.length <= 1;
    remove.addEventListener('click', () => {
      if (!confirm('Fjerne seksjon ' + (index + 1) + '? Innholdet fjernes fra denne arbeidskopien.')) return;
      blocks.splice(index, 1); $('sections').value = JSON.stringify(blocks, null, 2); renderSectionCards(); changed();
      $('sectionCards').querySelectorAll('input')[Math.min(index, blocks.length - 1)]?.focus();
    });
    bar.append(heading, remove);
    const titleLabel = document.createElement('label'); titleLabel.textContent = 'Overskrift'; titleLabel.htmlFor = 'section-title-' + index;
    const headingInput = document.createElement('input'); headingInput.id = titleLabel.htmlFor; headingInput.value = item[0];
    const bodyLabel = document.createElement('label'); bodyLabel.textContent = 'Innhold'; bodyLabel.htmlFor = 'section-body-' + index;
    const body = document.createElement('textarea'); body.id = bodyLabel.htmlFor; body.rows = 8; body.value = item[1]; body.spellcheck = true;
    const toolbar = document.createElement('div'); toolbar.className = 'format-toolbar'; toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', 'Formatering seksjon ' + (index + 1));
    function sync() { blocks[index] = [headingInput.value, body.value]; $('sections').value = JSON.stringify(blocks, null, 2); changed(); }
    for (const [name, tag] of [['Avsnitt','p'],['Fet','strong'],['Kursiv','em']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = name;
      button.addEventListener('click', () => {
        const start = body.selectionStart, end = body.selectionEnd, selected = body.value.slice(start, end);
        body.setRangeText('<' + tag + '>' + selected + '</' + tag + '>', start, end, 'select'); body.focus(); sync();
      }); toolbar.append(button);
    }
    headingInput.addEventListener('input', sync); headingInput.addEventListener('change', renderSectionNav); body.addEventListener('input', sync);
    card.append(bar, titleLabel, headingInput, bodyLabel, toolbar, body); parent.append(card);
  });
  renderSectionNav();
}
$('addSection').addEventListener('click', () => {
  if (current < 0) return;
  let blocks; try { blocks = validSections(JSON.parse($('sections').value)); } catch { status('Rett seksjonsdataene før du legger til en seksjon.'); return; }
  if (blocks.length >= 30) { status('Maksimalt 30 seksjoner.'); return; }
  blocks.push(['Ny seksjon', '<p></p>']); $('sections').value = JSON.stringify(blocks, null, 2); renderSectionCards(); changed();
  $('sectionCards').lastElementChild?.querySelector('input').focus();
});
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
  const design = button.dataset.view === 'design'; $('articlesView').hidden = design; $('designView').hidden = !design;
  $('currentView').textContent = design ? 'Design og UX' : 'Artikler';
  for (const b of document.querySelectorAll('[data-view]')) b.classList.toggle('active', b === button);
});
$('exportDesign').addEventListener('click', () => {
  const note = $('designNotes').value.trim(); if (!note) { $('designStatus').textContent = 'Skriv et notat før eksport.'; return; }
  const file = new Blob(['# MODUS Studio – Design og UX\n\n' + note + '\n'], {type:'text/markdown;charset=utf-8'});
  const url = URL.createObjectURL(file), a = document.createElement('a'); a.href = url; a.download = 'modus-design-ux-notater.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('designStatus').textContent = 'Notatet er klargjort for lokal nedlasting. Ingen endring er publisert.';
});
for (const id of ['demoButton','demoSecondary']) $(id).addEventListener('click', () => { $('designStatus').textContent = 'Komponentkontroll: ' + $(id).textContent + ' – lokal prøvevisning.'; });
status('Åpne en lokal content/articles.json for å begynne.');
renderList(); dirtyIndicator();

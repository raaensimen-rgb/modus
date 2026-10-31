// Preserve the imported article objects and all fields outside the editable subset.
export function validArticles(data) {
  if (!Array.isArray(data)) throw Error('Forventet en liste med artikler');
  const ids = new Set();
  for (const a of data) {
    if (!a || typeof a.slug !== 'string' || !a.slug || typeof a.title !== 'string' || typeof a.intro !== 'string') throw Error('Ugyldig artikkelstruktur');
    validSections(a.sections);
    if (ids.has(a.slug)) throw Error('Duplisert slug: ' + a.slug);
    ids.add(a.slug);
  }
  return data;
}
export function validSections(sections) {
  if (!Array.isArray(sections) || sections.some(s => !Array.isArray(s) || s.length !== 2 || s.some(x => typeof x !== 'string'))) throw Error('Seksjoner må være en liste av [overskrift, HTML]');
  return sections;
}
export function serializeArticles(articles) { return JSON.stringify(validArticles(articles), null, 2) + '\n'; }
export function articleMatches(article, query, level) {
  return (level === 'all' || article.level === level) && [article.title, article.intro, article.slug, article.topic].join(' ').toLocaleLowerCase('nb').includes(query.trim().toLocaleLowerCase('nb'));
}
export const levelLabel = level => ({beginner:'Nybegynner', intermediate:'Videre', advanced:'Fordypning'}[level] || level || 'Nivå ikke angitt');
export const localeLabel = locale => ({nb:'Norsk', no:'Norsk', en:'Engelsk'}[locale] || locale || 'Norsk');

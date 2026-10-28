import {parseFragment} from 'parse5';
export const LEVELS={beginner:'Nybegynner',intermediate:'Videre',advanced:'Fordypning'};
export const TOPICS={basics:'Toner og intervaller',chords:'Akkorder',harmony:'Harmonikk og stemmeføring',modes:'Skalaer og moduser',improvisation:'Improvisasjon',rhythm:'Rytmikk'};
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags=new Set('p strong b em i ul ol li br h3 h4 blockquote table thead tbody tfoot tr td th aside a sup sub code pre hr'.split(' '));
const drop=new Set('script style svg math iframe object embed form input button textarea select template noscript'.split(' '));
export function safeURL(value,image=false){
 const s=String(value||'').trim();
 if(/[\u0000-\u0020\\]/.test(s)||s.startsWith('//'))return '';
 if(/^https:\/\//i.test(s))return s;
 if(!image&&/^#[a-z0-9_-]+$/i.test(s))return s;
 if(/^\/?(?:en\/)?(?:images\/[a-z0-9_./-]+\.(?:svg|png|jpg|jpeg|webp)|(?:artikler\/[a-z0-9-]+|teori|akkorder|backingtracks|artikler|laer-dorisk|index)\.html)(?:#[a-z0-9_-]+)?$/i.test(s))return '/'+s.replace(/^\//,'');
 return '';
}
export function cleanHTML(raw){
 const walk=node=>{
  if(node.nodeName==='#text')return escape(node.value);
  const name=node.tagName;if(drop.has(name)||node.namespaceURI&&node.namespaceURI!=='http://www.w3.org/1999/xhtml')return '';
  const inner=(node.childNodes||[]).map(walk).join('');if(!tags.has(name))return inner;
  let attrs='';if(name==='a'){const href=safeURL(node.attrs?.find(a=>a.name==='href')?.value);if(href)attrs=` href="${escape(href)}" rel="noopener noreferrer"`;}
  if(name==='aside')attrs=' class="reading-note"';
  return `<${name}${attrs}>${inner}${name==='br'||name==='hr'?'':`</${name}>`}`;
 };
 return parseFragment(String(raw||'').slice(0,150000)).childNodes.map(walk).join('');
}
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export function normalizeArticle(input){
 const x=input||{};
 return {slug:text(x.slug,80),locale:x.locale==='en'?'en':'nb',title:text(x.title,180),intro:text(x.intro,1200),level:LEVELS[x.level]?x.level:'beginner',category:TOPICS[x.category]?x.category:'basics',topic:text(x.topic,100)||TOPICS[x.category]||TOPICS.basics,
  sections:(Array.isArray(x.sections)?x.sections:[]).slice(0,30).map(s=>[text(s?.[0],180),cleanHTML(s?.[1])]),exercise:text(x.exercise,4000),practice:safeURL(x.practice),practice_label:text(x.practice_label,120),image:{src:safeURL(x.image?.src,true),alt:text(x.image?.alt,300)},
  quiz:(Array.isArray(x.quiz)?x.quiz:[]).slice(0,3).map(q=>({question:text(q?.question,500),options:(Array.isArray(q?.options)?q.options:[]).slice(0,3).map(v=>text(v,500)),answer:Number.isInteger(q?.answer)?q.answer:-1,explanation:text(q?.explanation,2000),section:Number.isInteger(q?.section)?q.section:1}))};
}
export function validateArticle(x){
 const errors=[];
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug))errors.push('Adressen må inneholde små bokstaver, tall og bindestreker.');
 if(!x.title)errors.push('Skriv en overskrift.');if(!x.intro)errors.push('Skriv en innledning.');
 if(!x.sections.length||x.sections.some(s=>!s[0]||!s[1].replace(/<[^>]*>/g,'').trim()))errors.push('Hver del trenger en overskrift og tekst.');
 if(x.quiz.length!==3||x.quiz.some(q=>!q.question||!q.explanation||q.options.length!==3||q.options.some(v=>!v)||new Set(q.options).size!==3||q.answer<0||q.answer>2||q.section<1||q.section>x.sections.length))errors.push('Quizen trenger tre spørsmål med tre ulike svar, riktig svar og forklaring.');
 return errors;
}
export function renderQuiz(a){
 const e=a.locale==='en',t=(nb,en)=>e?en:nb;
 const fields=a.quiz.map((q,i)=>`<fieldset data-answer="${q.answer}"><legend>${i+1}. ${escape(q.question)}</legend><div class="quiz-options">${q.options.map((o,j)=>`<label><input type="radio" name="q${i}" value="${j}" required><span>${escape(o)}</span></label>`).join('')}</div><div class="quiz-feedback" hidden><strong class="quiz-verdict"></strong><p>${escape(q.explanation)}</p><a href="#del-${q.section}">${t('Les forklaringen i artikkelen ↗','Read the explanation ↗')}</a></div></fieldset>`).join('');
 return `<section id="quiz" class="article-quiz" data-quiz-id="${escape(a.slug)}" aria-labelledby="quizTitle"><p class="eyebrow">${t('SJEKK FORSTÅELSEN','CHECK YOUR UNDERSTANDING')}</p><h2 id="quizTitle">${t('Hva sitter igjen?','What have you learned?')}</h2><p>${t('Tre spørsmål om det du har lest. Alle tre riktige gir fullført quiz.','Three questions about the article. Answer all three correctly to complete the quiz.')}</p><p class="quiz-storage">${t('Fullføring lagres i denne nettleseren og deles mellom norsk og engelsk.','Completion is saved in this browser and shared between Norwegian and English.')}</p><div class="quiz-complete" hidden><strong>✓ ${t('Quiz fullført','Quiz completed')}</strong><p>${t('Ta ideen med til instrumentet.','Take the idea to your instrument.')}</p><button type="button" class="quiz-retake">${t('Repeter quizen','Retake quiz')}</button><a href="../artikler.html">${t('Til artikkelbiblioteket ↗','To the article library ↗')}</a></div><form class="quiz-form">${fields}<button class="button" type="submit">${t('Sjekk svarene','Check answers')}</button><button type="button" class="quiz-retry" hidden>${t('Prøv igjen','Try again')}</button></form><p class="quiz-result" role="status" aria-live="polite" tabindex="-1"></p></section>`;
}
export function renderArticle(a){
 const e=a.locale==='en',t=(nb,en)=>e?en:nb,label=e?({beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'}[a.level]):LEVELS[a.level];
 const image=a.image.src?`<figure class="reading-illustration"><img src="${escape(a.image.src)}" alt="${escape(a.image.alt)}" width="800" height="430"></figure>`:'';
 return `<article><header class="reading-header"><div class="reading-meta"><span class="level-badge ${a.level}">${label}</span><span>${escape(a.topic)}</span></div><h1>${escape(a.title)}</h1><p class="reading-intro">${escape(a.intro)}</p></header>${image}<div class="reading-layout"><aside class="contents"><span>${t('I DENNE ARTIKKELEN','IN THIS ARTICLE')}</span>${a.sections.map((s,i)=>`<a href="#del-${i+1}">${escape(s[0])}</a>`).join('')}<a href="#quiz">${t('Ta quizen ↗','Take the quiz ↗')}</a></aside><div class="reading-body">${a.sections.map((s,i)=>`<section id="del-${i+1}"><h2>${escape(s[0])}</h2>${cleanHTML(s[1])}</section>`).join('')}${a.exercise?`<section class="article-practice"><p class="eyebrow">${t('FRA LESING TIL SPILLING','FROM READING TO PLAYING')}</p><h2>${t('Prøv det selv.','Try it yourself.')}</h2><p>${escape(a.exercise)}</p>${a.practice?`<a class="button" href="${escape(a.practice)}">${escape(a.practice_label||t('Åpne øvelsen','Open exercise'))} ↗</a>`:''}</section>`:''}${renderQuiz(a)}</div></div></article>`;
}
export function renderCard(a){
 const e=a.locale==='en',base=e?'/en':'',label=e?({beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'}[a.level]):LEVELS[a.level];
 return `<article class="article-card" data-article-id="${escape(a.slug)}" data-level="${a.level}" data-topic="${a.category}" data-search="${escape(a.title+' '+a.topic+' '+a.intro)}"><a class="card-main" href="${base}/artikler/${a.slug}.html"><div class="card-art">${a.image.src?`<img src="${escape(a.image.src)}" alt="${escape(a.image.alt)}" width="800" height="430" loading="lazy">`:''}<span class="level-badge ${a.level}">${label}</span></div><div class="card-copy"><div class="card-meta"><span>${escape(a.topic)}</span></div><h2>${escape(a.title)}</h2><p>${escape(a.intro)}</p><span class="read-more">${e?'Read article':'Les artikkelen'} ↗</span></div></a><div class="card-quiz"><span class="card-quiz-status">${e?'3 questions':'3 spørsmål'}</span><a class="card-quiz-link" href="${base}/artikler/${a.slug}.html#quiz">${e?'Take quiz':'Ta quizen'} ↗</a></div></article>`;
}

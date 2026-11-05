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
// Narrow validated preservation of the existing pedagogical fields. No spread
// of unknown fields into payloads or HTML; corrupt/oversize metadata is rejected.
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function metadataText(x,path,max=4000){if(typeof x!=='string'||x.length>max)throw new TypeError('Ugyldig læringsmetadata: '+path);return x;}
function metadataObject(x,keys,path){if(!object(x)||Object.keys(x).some(k=>!keys.includes(k)))throw new TypeError('Ugyldig læringsmetadata: '+path);}
function metadataList(x,path){if(!Array.isArray(x)||x.length>30)throw new TypeError('Ugyldig læringsmetadata: '+path);return x.map(v=>metadataText(v,path));}
function pedagogical(x){
 const out={};
 if(x.learning!==undefined){
  const l=x.learning;metadataObject(l,['goals','prerequisites','links'],'learning');out.learning={};
  if(l.goals!==undefined)out.learning.goals=metadataList(l.goals,'learning.goals');
  if(l.prerequisites!==undefined)out.learning.prerequisites=metadataText(l.prerequisites,'learning.prerequisites');
  if(l.links!==undefined){if(!Array.isArray(l.links)||l.links.length>30)throw new TypeError('Ugyldig læringsmetadata: learning.links');out.learning.links=l.links.map(v=>{metadataObject(v,['slug','label'],'learning.links');if(!slugPattern.test(v.slug)||typeof v.slug!=='string'||v.slug.length>80)throw new TypeError('Ugyldig læringsmetadata: learning.links.slug');return {slug:v.slug,label:metadataText(v.label,'learning.links.label',180)};});}
 }
 if(x.practice_steps!==undefined)out.practice_steps=metadataList(x.practice_steps,'practice_steps');
 if(x.next_step!==undefined){metadataObject(x.next_step,['slug','reason'],'next_step');if(typeof x.next_step.slug!=='string'||!slugPattern.test(x.next_step.slug)||x.next_step.slug.length>80)throw new TypeError('Ugyldig læringsmetadata: next_step.slug');out.next_step={slug:x.next_step.slug,reason:metadataText(x.next_step.reason,'next_step.reason')};}
 return out;
}
function checkInput(x){
 if(!object(x)||!['nb','en'].includes(x.locale))throw new TypeError('Ugyldig eller manglende språk. Tillatt språk er nb og en.');
 for(const [k,max] of Object.entries({slug:80,title:180,intro:1200,topic:100,exercise:4000,practice:4000,practice_label:120}))if(x[k]!==undefined&&(typeof x[k]!=='string'||x[k].length>max))throw new TypeError('Ugyldig felt: '+k);
 for(const [k,values] of [['level',LEVELS],['category',TOPICS]])if(x[k]!==undefined&&!Object.hasOwn(values,x[k]))throw new TypeError('Ugyldig felt: '+k);
 if(x.sections!==undefined&&(!Array.isArray(x.sections)||x.sections.length>30||x.sections.some(v=>!Array.isArray(v)||v.length!==2||typeof v[0]!=='string'||typeof v[1]!=='string'||v[0].length>180||v[1].length>150000)))throw new TypeError('Ugyldig felt: sections');
 if(x.image!==undefined&&(!object(x.image)||['src','alt'].some(k=>x.image[k]!==undefined&&(typeof x.image[k]!=='string'||x.image[k].length>(k==='alt'?300:4000)))))throw new TypeError('Ugyldig felt: image');
 if(x.quiz!==undefined&&(!Array.isArray(x.quiz)||x.quiz.length>3||x.quiz.some(v=>!object(v)||!Array.isArray(v.options)||v.options.length>3||v.options.some(o=>typeof o!=='string'||o.length>500)||['question','explanation'].some(k=>v[k]!==undefined&&(typeof v[k]!=='string'||v[k].length>(k==='question'?500:2000)))||['answer','section'].some(k=>v[k]!==undefined&&!Number.isInteger(v[k])))))throw new TypeError('Ugyldig felt: quiz');
}
export function normalizeArticle(input){
 const x=input;checkInput(x);
 return {...pedagogical(x),slug:text(x.slug,80),locale:x.locale,title:text(x.title,180),intro:text(x.intro,1200),level:LEVELS[x.level]?x.level:'beginner',category:TOPICS[x.category]?x.category:'basics',topic:text(x.topic,100)||TOPICS[x.category]||TOPICS.basics,
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

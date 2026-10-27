(function(){
 'use strict';
 function matches(article,filters){
  const normalize=s=>s.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const words=normalize(filters.q.trim()).split(/\s+/).filter(Boolean);
  return (filters.level==='all'||article.level===filters.level)&&(filters.topic==='all'||article.topic===filters.topic)&&words.every(w=>normalize(article.search).includes(w));
 }
 function nextArticle(articles,completed){return articles.find(a=>!completed(a.id))||null;}
 if(typeof module!=='undefined'&&module.exports)module.exports={matches,nextArticle};
 if(typeof document==='undefined')return;
 const en=document.documentElement.lang==='en',t=(nb,english)=>en?english:nb;
 const cards=[...document.querySelectorAll('.article-card')];
 const orderedIds=["toner-og-intervaller", "dur-og-moll", "bygg-akkorder-i-en-toneart", "kvintsirkelen", "din-forste-improvisasjon", "septimakkorder", "ett-skalakart-nye-maltoner", "ii-v-i-kadensen", "moduser-og-tonalt-sentrum", "dorisk-og-eolisk", "harmonisk-moll-og-frygisk-dominant", "stemmeforing", "rytme-i-sju-aatte"];
 cards.sort((a,b)=>orderedIds.indexOf(a.dataset.articleId)-orderedIds.indexOf(b.dataset.articleId));
 const items=cards.map(card=>({id:card.dataset.articleId,level:card.dataset.level,topic:card.dataset.topic,search:card.dataset.search+' '+card.querySelector('h2').textContent,card}));
 const search=document.getElementById('articleSearch'),container=document.getElementById('articleGroups');
 const levelButtons=[...document.querySelectorAll('[data-filter]')],topicButtons=[...document.querySelectorAll('[data-topic-filter]')],views=[...document.querySelectorAll('[data-group-by]')];
 const state={level:'all',topic:'all',q:'',view:'level'};
 const hints={all:t('From your first notes to new harmonic possibilities.','From your first notes to new harmonic possibilities.'),beginner:t('Start with the building blocks. No prior knowledge needed.','Start with the building blocks. No prior knowledge needed.'),intermediate:t('Connect scales, chords and improvisation.','Connect scales, chords and improvisation.'),advanced:t('Go further with modality, voice leading and rhythm.','Go further with modality, voice leading and rhythm.')};
 function completed(id){return window.ModusAccount?window.ModusAccount.has(id):cards.find(c=>c.dataset.articleId===id)?.classList.contains('is-complete');}
 function regroup(){
  const template=document.getElementById(state.view==='topic'?'topicGroupTemplate':'levelGroupTemplate');
  // Keep the existing card nodes and their completion state while changing groups.
  container.replaceChildren(template.content.cloneNode(true));
  items.forEach(item=>container.querySelector(`[data-category="${item[state.view]}"] .article-grid`).append(item.card));
 }
 function updateProgress(){
  document.querySelectorAll('[data-stage-progress]').forEach(label=>{
   const stage=items.filter(a=>a.level===label.dataset.stageProgress),done=stage.filter(a=>completed(a.id)).length;
   label.textContent=en?`${done} / ${stage.length} quizzes completed`:`${done} / ${stage.length} quizer fullført`;
   label.closest('.journey-stage').classList.toggle('stage-complete',done===stage.length);
  });
  const next=nextArticle(items,completed),link=document.getElementById('nextArticle');
  const item=next||items[0];link.href=item.card.querySelector('.card-main').getAttribute('href');
  link.querySelector('[data-next-label]').textContent=next?t('YOUR NEXT STEP','YOUR NEXT STEP'):t('ALLE QUIZER FULLFØRT','ALL QUIZZES COMPLETED');
  link.querySelector('[data-next-title]').textContent=next?item.card.querySelector('h2').textContent:t('Ta ideene videre til instrumentet.','Take these ideas to your instrument.');
  link.querySelector('[data-next-note]').textContent=next?t('The first article without a completed quiz. This order is a suggestion, not a requirement.','The first article without a completed quiz. This order is a suggestion, not a requirement.'):t('Du kan åpne og repetere artiklene når du vil. Begynn med byggesteinene igjen ↗','You can revisit any article whenever you like. Review the building blocks ↗');
  updateGroupCounts();
 }
 function updateGroupCounts(){
  container.querySelectorAll('.article-category').forEach(group=>{
   const visible=[...group.querySelectorAll('.article-card')].filter(c=>!c.hidden),done=visible.filter(c=>completed(c.dataset.articleId)).length;
   group.hidden=visible.length===0;
   group.querySelector('[data-category-count]').textContent=en?`${visible.length} ${visible.length===1?'article':'articles'} · ${done} ${done===1?'quiz':'quizzes'} completed`:`${visible.length} ${visible.length===1?'artikkel':'artikler'} · ${done} ${done===1?'quiz':'quizer'} fullført`;
  });
 }
 function saveUrl(){
  const url=new URL(location.href);
  for(const key of ['level','topic','q','view']){
   const value=state[key],empty=key==='view'?value==='level':key==='q'?!value:value==='all';
   if(empty)url.searchParams.delete(key);else url.searchParams.set(key,value);
  }
  history.replaceState(null,'',url.pathname+url.search+url.hash);
 }
 function apply(write=true){
  let count=0;items.forEach(item=>{item.card.hidden=!matches(item,state);if(!item.card.hidden)count++;});
  levelButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.level)));
  topicButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topicFilter===state.topic)));
  views.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.groupBy===state.view)));
  document.getElementById('resultCount').textContent=en?`${count} ${count===1?'article':'articles'}`:`${count} ${count===1?'artikkel':'artikler'}`;
  document.getElementById('levelHint').textContent=hints[state.level];
  document.getElementById('noResults').hidden=count!==0;
  updateGroupCounts();if(write)saveUrl();
 }
 function restore(){
  const params=new URL(location.href).searchParams;
  state.level=levelButtons.some(b=>b.dataset.filter===params.get('level'))?params.get('level'):'all';
  state.topic=topicButtons.some(b=>b.dataset.topicFilter===params.get('topic'))?params.get('topic'):'all';
  state.view=params.get('view')==='topic'?'topic':'level';state.q=params.get('q')||'';search.value=state.q;
  regroup();apply(false);updateProgress();
 }
 levelButtons.forEach(b=>b.addEventListener('click',()=>{state.level=b.dataset.filter;apply();}));
 topicButtons.forEach(b=>b.addEventListener('click',()=>{state.topic=b.dataset.topicFilter;apply();}));
 views.forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.groupBy;regroup();apply();}));
 search.addEventListener('input',()=>{state.q=search.value;apply();});
 document.getElementById('resetArticles').addEventListener('click',()=>{state.level='all';state.topic='all';state.q='';search.value='';apply();search.focus();});
 document.querySelectorAll('[data-start-level]').forEach(a=>a.addEventListener('click',()=>{
  state.level=a.dataset.startLevel;state.topic='all';state.q='';state.view='level';search.value='';regroup();apply();
 }));
 document.addEventListener('modus-account-change',updateProgress);
 window.addEventListener('pageshow',updateProgress);
 window.addEventListener('popstate',restore);
 if(window.ModusAccount)window.ModusAccount.ready.then(updateProgress);
 restore();
}());

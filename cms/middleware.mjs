import config from '../client/supabase-config.json';
import originalIds from './static-ids.json';
import {normalizeArticle,validateArticle,renderArticle,renderCard} from './model.mjs';
export async function onRequest(context){
 const url=new URL(context.request.url),match=url.pathname.match(/^\/(en\/)?artikler(?:\.html|\/([a-z0-9-]+)(?:\.html)?|\/)?$/);
 if(!match||!['GET','HEAD'].includes(context.request.method))return context.next();
 const locale=match[1]?'en':'nb',slug=match[2],base=locale==='en'?'/en':'';
 let rows;
 try{
  const response=await fetch(config.url+'/rest/v1/cms_article_publications?select=slug,locale,payload,revision&locale=eq.'+locale+'&order=published_at.asc&limit=1000',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(3500)});
  if(!response.ok)throw Error('Content unavailable');rows=(await response.json()).map(r=>normalizeArticle(r.payload)).filter(a=>a.locale===locale&&!validateArticle(a).length);
 }catch{
  if(slug&&!originalIds.includes(slug))return new Response('Artikkelen kunne ikke lastes akkurat nå. Prøv igjen om litt.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  return context.next();
 }
 const article=slug&&rows.find(a=>a.slug===slug);
 if(slug&&!article){if(originalIds.includes(slug))return context.next();return new Response('Artikkelen er ikke publisert på dette språket.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
 let response;
 if(article){const template=new URL(base+'/artikler/toner-og-intervaller',url);response=await context.env.ASSETS.fetch(new Request(template,{method:'GET'}));}
 else response=await context.next();
 if(response.status!==200||!response.headers.get('Content-Type')?.includes('text/html'))return response;
 const ids=[...new Set(originalIds.concat(rows.map(a=>a.slug)))],headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.delete('ETag');headers.delete('Content-Length');
 const inject='<script>window.MODUS_CMS_IDS='+JSON.stringify(ids).replace(/</g,'\\u003c')+';</script>';
 let rewrite=new HTMLRewriter().on('head',{element(e){e.prepend(inject,{html:true});}});
 if(article){
  rewrite=rewrite.on('.reading-page > article',{element(e){e.replace(renderArticle(article),{html:true});}}).on('title',{element(e){e.setInnerContent(article.title+' · MODUS');}}).on('meta[name="description"]',{element(e){e.setAttribute('content',article.intro);}}).on('.breadcrumbs span:last-child',{element(e){e.setInnerContent(locale==='en'?({beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'}[article.level]):({beginner:'Nybegynner',intermediate:'Videre',advanced:'Fordypning'}[article.level]));}});
 }else{
  const byId=new Map(rows.map(a=>[a.slug,a]));
  rewrite=rewrite.on('.article-card',{element(e){const a=byId.get(e.getAttribute('data-article-id'));if(a)e.replace(renderCard(a),{html:true});}});
  const additions=rows.filter(a=>!originalIds.includes(a.slug));
  for(const level of ['beginner','intermediate','advanced'])rewrite=rewrite.on(`.article-category[data-category="${level}"] .article-grid`,{element(e){e.append(additions.filter(a=>a.level===level).map(renderCard).join(''),{html:true});}});
 }
 const result=rewrite.transform(new Response(response.body,{status:200,headers}));
 return context.request.method==='HEAD'?new Response(null,{status:result.status,headers:result.headers}):result;
}

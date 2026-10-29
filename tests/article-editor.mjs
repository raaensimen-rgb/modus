import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseFragment} from 'parse5';
import {cleanHTML,normalizeArticle,validateArticle,renderArticle,renderCard,safeURL} from '../cms/model.mjs';
import {onRequest} from '../cms/middleware.mjs';
const seed=JSON.parse(fs.readFileSync('dist/cms-seed.json','utf8'));
assert.equal(seed.length,2*JSON.parse(fs.readFileSync('content/articles.json','utf8')).length);
for(const raw of seed){const a=normalizeArticle(raw);assert.deepEqual(validateArticle(a),[],raw.slug+' '+raw.locale);const page=renderArticle(a);assert.equal((page.match(/<fieldset data-answer=/g)||[]).length,3);assert.equal((page.match(/type="radio"/g)||[]).length,9);for(let i=1;i<=a.sections.length;i++)assert(page.includes(`id="del-${i}"`));assert(renderCard(a).includes(`/artikler/${a.slug}.html`));}
const dirty='<script>alert(1)</script><svg><foreignObject><p onclick="evil()">X</p></foreignObject></svg><p onclick="evil()"><strong>Safe</strong><a href="java&#x73;cript:alert(1)">bad</a><img src=x onerror=evil()></p><iframe srcdoc="evil"></iframe>';
const safe=cleanHTML(dirty);assert(safe.includes('<strong>Safe</strong>'));assert(!/script|onclick|onerror|<svg|<iframe|<img|foreignObject/i.test(safe));assert.equal(cleanHTML(safe),safe);
for(const value of ['javascript:alert(1)','//evil.test/x','data:text/html,<script>','/\\evil.test','https:\\evil.test','https://good.test/\nalert'])assert.equal(safeURL(value),'');
assert.equal(safeURL('/teori.html#moduser'),'/teori.html#moduser');
const bad=normalizeArticle({...seed[0],title:'',quiz:[]});assert(validateArticle(bad).length>=2);
const injected=normalizeArticle({...seed[0],title:'<img src=x onerror=evil()>',intro:'</p><script>evil()</script>'});assert(!renderArticle(injected).includes('<script>'));assert(renderArticle(injected).includes('&lt;img'));
const ids=[];function walk(n){if(n.attrs){const id=n.attrs.find(a=>a.name==='id');if(id)ids.push(id.value);}for(const c of n.childNodes||[])walk(c);}walk(parseFragment(renderArticle(normalizeArticle(seed[0]))));assert.equal(new Set(ids).size,ids.length);
// The same allow-list includes a newly published ID, while unknown IDs remain rejected.
const code=fs.readFileSync('dist/article-quiz.js','utf8'),scope={module:{exports:{}},window:{MODUS_CMS_IDS:['ny-artikkel']}};vm.runInNewContext(code,scope);assert(scope.module.exports.IDS.includes('ny-artikkel'));assert.equal(scope.module.exports.progress(null).pass('unknown'),false);
const calls=[];globalThis.HTMLRewriter=class{on(selector,handler){calls.push({selector,handler});return this;}transform(response){return response;}};
const previousFetch=globalThis.fetch;
const published=normalizeArticle({...seed[0],slug:'en-helt-ny-artikkel'});
let mode='published',staticRequests=0,assetRequests=0;
globalThis.fetch=async url=>{assert(String(url).includes('/cms_article_publications?'));assert(!String(url).includes('draft'));if(mode==='offline')throw Error('offline');return Response.json(mode==='empty'?[]:[{payload:published}]);};
function context(path){return {request:new Request('https://modus.test'+path),next:async()=>{staticRequests++;return new Response('Original article',{headers:{'Content-Type':'text/html'}});},env:{ASSETS:{fetch:async req=>{assetRequests++;assert(new URL(req.url).pathname.endsWith('/artikler/toner-og-intervaller'));return new Response('Article template',{headers:{'Content-Type':'text/html'}});}}}};}
mode='empty';assert.equal(await (await onRequest(context('/artikler/toner-og-intervaller.html'))).text(),'Original article');
assert.equal((await onRequest(context('/artikler/not-published.html'))).status,404);
mode='published';calls.length=0;let res=await onRequest(context('/artikler/en-helt-ny-artikkel.html'));assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(assetRequests,1);assert(calls.some(c=>c.selector==='.reading-page > article'));
let replacement;calls.find(c=>c.selector==='.reading-page > article').handler.element({replace:s=>replacement=s});assert(replacement.includes(published.title));assert(!replacement.includes('Draft changed'));
calls.length=0;await onRequest(context('/artikler.html'));assert(calls.some(c=>c.selector==='.article-card'));assert(calls.some(c=>c.selector.includes('data-category="beginner"')));
mode='offline';res=await onRequest(context('/artikler/en-helt-ny-artikkel'));assert.equal(res.status,503);assert.equal(await (await onRequest(context('/artikler/toner-og-intervaller'))).text(),'Original article');
const before=staticRequests;await onRequest(context('/backingtracks.html'));assert.equal(staticRequests,before+1);
globalThis.fetch=previousFetch;
console.log('Passed: 26 editor imports, sanitization, quiz validity, dynamic IDs, publication routing, draft exclusion and static fallback.');

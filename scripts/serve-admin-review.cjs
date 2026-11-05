'use strict';
// Loopback-only review of the real CMS with a disconnected transport.
// No Cloudflare/Supabase credentials, private file browsing, writes or external API.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {build}=require('esbuild'),root=path.resolve(__dirname,'..');
const port=Number(process.env.MODUS_ADMIN_PORT||8767);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local review port');
function releaseMetadata(){
 const out={kind:'modus-local-admin-status',mode:'offline-local',deployment:null};
 if(!process.env.MODUS_ADMIN_STATUS_FILE)return out;
 try{const raw=JSON.parse(fs.readFileSync(process.env.MODUS_ADMIN_STATUS_FILE,'utf8'));if(raw.project!=='modus-2-preview'||!/^https:\/\/[a-f0-9]+\.modus-2-preview\.pages\.dev\/?$/.test(raw.url)||! /^[a-f0-9]{40}$/.test(raw.source?.commit_hash))throw Error();out.deployment={id:String(raw.deployment_id).slice(0,100),sha:raw.source.commit_hash,url:raw.url,at:raw.latest_stage?.ended_on||null};}catch{out.metadataUnavailable=true;}
 if(out.deployment&&process.env.MODUS_ADMIN_PUBLIC_DIST){
  try{const dist=path.resolve(process.env.MODUS_ADMIN_PUBLIC_DIST),manifest=JSON.parse(fs.readFileSync(path.join(dist,'preview-isolation.json'),'utf8'));
   if(manifest.project!=='modus-2-preview'||manifest.source_sha!==out.deployment.sha||manifest.backend!=='disabled'||!Array.isArray(manifest.files))throw Error();
   out.publicPages=manifest.files.filter(v=>/^(?:en\/)?(?:[a-z0-9-]+|artikler\/[a-z0-9-]+)\.html$/.test(v.path)).map(v=>{const bytes=fs.readFileSync(path.join(dist,v.path));if(crypto.createHash('sha256').update(bytes).digest('hex')!==v.sha256)throw Error();const html=bytes.toString('utf8');return {path:'/'+v.path,title:(/<title>([^<]*)<\/title>/.exec(html)?.[1]||v.path).slice(0,200),locale:v.path.startsWith('en/')?'en':'nb',held:html.includes('data-publication-hold')};});
  }catch{out.publicInventoryUnavailable=true;}
 }
 return out;
}
(async()=>{
 const stub=`export function createClient(){const blocked=async()=>({error:{message:'Kun lokal kontroll: autentisering og backend er deaktivert.'}});return {auth:{getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>{},signOut:async()=>({}),signInWithPassword:blocked,signUp:blocked,verifyOtp:blocked},from(){throw Error('Backend disabled in local review')},rpc:blocked};}`;
 const editor=await build({entryPoints:[path.join(root,'client/editor.js')],bundle:true,format:'esm',write:false,plugins:[{name:'offline-local-transport',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'offline',namespace:'local'}));b.onLoad({filter:/.*/,namespace:'local'},()=>({contents:stub,loader:'js'}));b.onLoad({filter:/supabase-config\.json$/},()=>({contents:'{"url":"https://offline.invalid","publishableKey":"disabled-local-only"}',loader:'json'}));}}]});
 const consoleBundle=await build({entryPoints:[path.join(root,'editor-admin.js')],bundle:true,format:'esm',write:false});
 const startup=`import './editor-runtime.js';import './editor-admin.js';document.getElementById('tryEditor').click();if(document.getElementById('editorWorkspace').hidden)await new Promise(resolve=>{const o=new MutationObserver(()=>{if(!document.getElementById('editorWorkspace').hidden){o.disconnect();resolve();}});o.observe(document.getElementById('editorWorkspace'),{attributes:true});});document.getElementById('newArticle').click();document.querySelector('[data-console-view=overview]').click();`;
 const html=fs.readFileSync(path.join(root,'cms/editor.html'),'utf8').replace('<script src="editor.js" type="module"></script><script src="editor-admin.js" type="module"></script>','<script src="local-start.js" type="module"></script>');
 const allowed=new Set(['articles.css','article-quiz.js','editor-admin.css','admin-console.css','editor.css','home.css','design-system.css','modus-identity-icon.svg','apple-touch-icon.png']);
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; font-src 'self'; form-action 'none'; base-uri 'self'; frame-ancestors 'none'");
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let p;try{p=new URL(req.url,'http://localhost').pathname.replace(/^\/en\/article-quiz.js$/,'/article-quiz.js');}catch{res.writeHead(400);return res.end();}
  let body,type;if(p==='/'||p==='/redaktor.html'){body=html;type='text/html';}else if(p==='/editor-runtime.js'){body=editor.outputFiles[0].text;type='text/javascript';}else if(p==='/editor-admin.js'){body=consoleBundle.outputFiles[0].text;type='text/javascript';}else if(p==='/local-start.js'){body=startup;type='text/javascript';}else if(p==='/cms-seed.json'){body='[]';type='application/json';}else if(p==='/admin-status.json'){body=JSON.stringify(releaseMetadata());type='application/json';}else if(allowed.has(p.slice(1))){body=fs.readFileSync(path.join(root,p.slice(1)));type=p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':p.endsWith('.svg')?'image/svg+xml':'image/png';}else{res.writeHead(404);return res.end();}res.setHeader('Content-Type',type+'; charset=utf-8');res.end(req.method==='HEAD'?undefined:body);
 });server.listen(port,'127.0.0.1',()=>console.log('Offline actual CMS: http://127.0.0.1:'+port+'/redaktor.html'));
})();

'use strict';
// Separate static admin artifact. Never invokes Wrangler, network, or the public build.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process'),{build}=require('esbuild');
const ROOT=path.resolve(__dirname,'..'),arg=process.argv.find(v=>v.startsWith('--out=')),OUT=path.resolve(ROOT,arg?arg.slice(6):'.build-private/admin-preview');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src 'self' blob:; frame-ancestors 'none'; form-action 'none'; base-uri 'self'; object-src 'none'; worker-src 'none'";
const PROJECT='modus-2-preview',BRANCH='dev/modus-2-pr52',HOST='dev-modus-2-pr52.modus-2-preview.pages.dev';
(async()=>{
 const branch=execFileSync('git',['branch','--show-current'],{cwd:ROOT,encoding:'utf8'}).trim(),sha=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
 if(branch!=='dev/modus-2-pr52')throw Error('Expected approved source development branch');
 if(OUT===ROOT||OUT===path.join(ROOT,'dist')||OUT.startsWith(path.join(ROOT,'dist')+path.sep))throw Error('Admin must never replace the public dist');
 if(fs.existsSync(OUT)&&fs.readdirSync(OUT).length)throw Error('Output is not empty; existing files are preserved. Choose a new reviewed output directory.');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'modus-admin-build-'));
 try{
  const bundle=await build({absWorkingDir:ROOT,entryPoints:['client/admin-preview-start.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,sourcemap:false,metafile:true,legalComments:'inline',plugins:[{name:'browser-only-transport',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:path.join(ROOT,'client/admin-preview-transport.js')}));b.onLoad({filter:/supabase-config\.json$/},()=>({contents:'{"url":"https://offline.invalid","publishableKey":"disabled-browser-only"}',loader:'json'}));}}]});
  if(Object.keys(bundle.metafile.inputs).some(n=>/node_modules\/@supabase\//.test(n)))throw Error('Backend SDK bundled');
  fs.writeFileSync(path.join(temp,'admin-app.js'),bundle.outputFiles[0].contents);
  let html=fs.readFileSync(path.join(ROOT,'cms/editor.html'),'utf8');
  const scripts=/<script src="editor.js" type="module"><\/script><script src="editor-admin.js" type="module"><\/script>/;
  if(!scripts.test(html))throw Error('Unexpected CMS script contract');
  html=html.replace(scripts,'<script src="admin-app.js" type="module"></script>');
  for(const name of ['index.html','redaktor.html'])fs.writeFileSync(path.join(temp,name),html);
  for(const name of ['home.css','editor.css','editor-admin.css','admin-console.css','design-system.css','articles.css','article-quiz.js','modus-identity-icon.svg','apple-touch-icon.png']){
   let data=fs.readFileSync(path.join(ROOT,name));if(name.endsWith('.css'))data=Buffer.from(data.toString().replace(/@import\s+url\([^)]*https:\/\/fonts\.googleapis\.com[^)]*\);?/g,''));
   fs.writeFileSync(path.join(temp,name),data);
  }
  fs.mkdirSync(path.join(temp,'en'));fs.copyFileSync(path.join(temp,'article-quiz.js'),path.join(temp,'en/article-quiz.js'));
  fs.writeFileSync(path.join(temp,'cms-seed.json'),'[]\n');
  fs.writeFileSync(path.join(temp,'admin-status.json'),JSON.stringify({kind:'modus-local-admin-status',mode:'browser-only-protected-preview',deployment:null,storage:{location:'browser-origin',crossDeviceSync:false},project:PROJECT}));
  fs.writeFileSync(path.join(temp,'404.html'),'<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>MODUS – ikke funnet</title><p>Ressursen finnes ikke i denne administratorpakken.</p></html>');
  fs.writeFileSync(path.join(temp,'robots.txt'),'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(temp,'_headers'),'/*\n  Cache-Control: private, no-store, max-age=0, must-revalidate\n  Content-Security-Policy: '+CSP+'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
  const names=fs.readdirSync(temp,{recursive:true}).filter(n=>fs.statSync(path.join(temp,n)).isFile()).sort(),texts=names.filter(n=>!n.endsWith('.png')).map(n=>[n,fs.readFileSync(path.join(temp,n),'utf8')]);
  for(const [name,text] of texts){if(/sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}|[a-z0-9-]+\.supabase\.(?:co|in)|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sourceMappingURL=/.test(text))throw Error('Forbidden credential, backend reference or map in '+name);}
  if(names.some(n=>/\.map$|(?:^|\/)(?:content|editorial|docs|tests|functions)\/|(?:^|\/)\.env/.test(n)))throw Error('Private/source path included');
  const manifest={schema_version:1,kind:'modus-protected-admin-browser-only',project:PROJECT,planned_preview_branch:BRANCH,planned_hostname:HOST,source_branch:branch,source_sha:sha,tracked_source_dirty:!!execFileSync('git',['diff','--name-only','HEAD','--','.',':!dist'],{cwd:ROOT,encoding:'utf8'}).trim(),untracked_source_files:execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean),backend:'disabled',ownerApproval:'disabled',publishing:'disabled',externalAI:'disabled',cmsSeedRecords:0,crossDeviceSync:false,accessVerification:'required-on-actual-deployment-before-use',csp:CSP,files:names.map(name=>({path:name,bytes:fs.statSync(path.join(temp,name)).size,sha256:sha256(fs.readFileSync(path.join(temp,name)))}))};
  fs.writeFileSync(path.join(temp,'admin-package.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.mkdirSync(OUT,{recursive:true});fs.cpSync(temp,OUT,{recursive:true});
  console.log(JSON.stringify({out:OUT,source_sha:sha,files:manifest.files.length+1,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0),planned_url:'https://'+HOST+'/redaktor.html',backend:'disabled',privateDataIncluded:false,deployed:false},null,2));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1});

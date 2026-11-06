"""Reproducible reader integration on the previously public isolated platform."""
from pathlib import Path
import json,shutil,hashlib,re,subprocess,os
R=Path(__file__).resolve().parents[1];I=R/'release-inputs';B=I/'platform';D=R/'dist';O=R.parent/'package'
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((B/'public-library-release.json').read_text());assert m['source_sha']=='f64e25b74bebc8868f3438cf57937b1f11fe5c1f'
for f in m['files']:assert hash(B/f['path'])==f['sha256'],f['path']
if O.exists():shutil.rmtree(O)
shutil.copytree(B,O)
for pre in ['', 'en/']:
 for folder in ['artikler','images/articles']:shutil.copytree(D/(pre+folder),O/(pre+folder),dirs_exist_ok=True)
 for name in ['artikler.html','articles.js','article-quiz.js','search-index.json','app.js','chord-tool.js','redaktor.html']:shutil.copy2(D/(pre+name),O/(pre+name))
# Homepage now comes from maintained source/build rather than the historic platform snapshot.
for pre in ['', 'en/']:
 baseline=(B/(pre+'index.html')).read_text();generated=(D/(pre+'index.html')).read_text()
 # Keep the already audited public security/network head; replace the maintained DOM body.
 page=baseline[:baseline.index('<body')]+generated[generated.index('<body'):]
 (O/(pre+'index.html')).write_text(page)
for target in O.rglob('*.html'):
 generated=D/target.relative_to(O)
 if generated.is_file():
  current=target.read_text();header=re.search(r'<header class="site-header">[\s\S]*?</header>',generated.read_text())
  if header:target.write_text(re.sub(r'<header class="site-header">[\s\S]*?</header>',lambda _:header[0],current,count=1))
for name in ['studierute.html','library-ids.js']:shutil.copy2(I/name,O/name)
for a in json.loads((R/'content/articles.json').read_text())[16:]:
 shutil.copy2(B/'en/artikler'/(a['slug']+'.html'),O/'en/artikler'/(a['slug']+'.html'))
# Reuse the already isolated account/guard. CMS seed and runtime never enter public package.
for p in O.rglob('*.html'):
 s=p.read_text();s=re.sub(r'account\.[a-f0-9]{10}\.js','account.js',s);locale='en' if p.relative_to(O).parts[0]=='en' else 'nb'
 if 'reading-page' in s and 'data-work-in-progress' not in s and p.parent.name=='artikler':
  note='Work in progress — not academically approved' if locale=='en' else 'Under arbeid – ikke faglig sluttgodkjent'
  s=re.sub(r'(<main\b[^>]*class="reading-page"[^>]*>)',lambda m:m[0]+'<aside class="reading-note" data-work-in-progress><strong>'+note+'</strong></aside>',s,count=1)
 if 'library-ids.js' not in s:s=s.replace('</head>','<script src="'+os.path.relpath(O/'library-ids.js',p.parent)+'"></script></head>',1)
 p.write_text(s)
for name in ['mountain-original.svg','atlas-original.svg']:
 for pre in ['', 'en/']:shutil.copy2(I/name,O/(pre+'images/'+name))
for pre in ['', 'en/']:
 for name in ['kick','snare','hihat']:
  shutil.copy2(I/'audio'/(name+'.wav'),O/(pre+'audio/'+name+'.wav'))
  (O/(pre+'audio/'+name+'.mp3')).unlink(missing_ok=True)
 credits=O/(pre+'audio/LICENSE.txt');s=credits.read_text();s=re.sub(r'ACOUSTIC DRUM KIT[\s\S]*?(?=ACOUSTIC GRAND PIANO)','SYNTHETIC DRUM KIT\nOriginal oscillator and seeded-noise synthesis made for MODUS, 2026-11-05.\nNo external recordings. Source: scripts/generate-release-assets.py in the release source archive.\n\n',s);credits.write_text(s)
 for name in ['media/modus-introduksjon.mp4']:(O/(pre+name)).unlink(missing_ok=True)
 for p in (O/pre).glob('app*.js'):
  p.write_text(p.read_text().replace('audio/${name}.mp3','audio/${name}.wav').replace('akustiske trommer','syntetiske trommer').replace('acoustic drums','synthetic drums'))
# Apply to all generated language/style copies, including hashed ones.
for p in O.rglob('*'):
 if not p.is_file() or p.suffix not in ['.html','.css','.js','.json']:continue
 if p.name in ['public-library-release.json','preview-isolation.json']:continue
 s=p.read_text()  # Preserve the owner's original generated images and touch icon.
 if p.suffix=='.html':
  s=re.sub(r'<button\b[^>]*data-intro-film-open[\s\S]*?</button>','',s)
  s=s.replace('Trommer: Tone.js audio, acoustic-kit.','Trommer: egen syntese for MODUS.').replace('Drums: Tone.js audio, acoustic-kit.','Drums: original synthesis for MODUS.')
  s=s.replace('akustiske trommer','syntetiske trommer').replace('acoustic drums','synthetic drums')
 if p.name=='intro-film.js':s='/* Introduction film withheld pending documented media rights. */\n'
 p.write_text(s)
for name in ['public-library-release.json','preview-isolation.json']:(O/name).unlink(missing_ok=True)
assert json.loads((O/'cms-seed.json').read_text())==[]
for pre,n in [('',52),('en/',16)]:
 index=json.loads((O/(pre+'search-index.json')).read_text());assert len([x for x in index if x['type']=='article'])==n
assert len(list((O/'artikler').glob('*.html')))==52
assert not any(p.name in ['admin-app.js','editor.js','editor-admin.js','library-draft-backup.json','_worker.js'] for p in O.rglob('*'))
# Pages retains removed assets in its CDN; explicit retirement routes override old cache.
retired=['media/modus-introduksjon.mp4','audio/kick.mp3','audio/snare.mp3','audio/hihat.mp3']
(O/'_redirects').write_text(''.join('/'+prefix+name+' /retired-media-resource 302\n' for prefix in ['', 'en/'] for name in retired))
# Candidate-only illustration integration; no publication or permission mutation.
subprocess.run(['python3',str(R/'scripts/integrate-teaching-diagrams.py'),str(O)],check=True)
import runpy
runpy.run_path(str(R/'scripts/apply-design-refresh.py'))['apply'](O)
runpy.run_path(str(R/'scripts/apply-article-library.py'))['apply'](O)
runpy.run_path(str(R/'scripts/apply-library-hero.py'))['apply'](O)
runpy.run_path(str(R/'scripts/apply-compact-navigation.py'))['apply'](O)
runpy.run_path(str(R/'scripts/preserve-film-baseline.py'))['apply'](O)
runpy.run_path(str(R/'scripts/apply-approved-intro-film.py'))['apply'](O)
(O/'release-manifest.json').unlink(missing_ok=True)  # Manifest cannot hash its own previous version.
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
manifest={'schema_version':1,'kind':'modus-article-library-hero','public_baseline_sha':'96ec05803ff6926e540386ed3e32c60f87c4b5a7','requires_owner_deploy_approval':True,'project':'modus-2-preview','source_sha':sha,'baseline_sha':m['source_sha'],'integration_base_sha':'1a781fe23e60f8d6225cc976b33e9be3d220e7f4','published_design_base_sha':'2ec2ce517fabbc8c691703868b73115241d330fb','articles_nb':52,'articles_en':16,'academic_status':'not_finally_approved','backend':'disabled','cms_seed_records':0,'private_admin':'separate Access-protected branch','rights_replacements':[x for x in json.loads((I/'original-assets.json').read_text()) if x['path'].startswith('audio/')],'restored_images':['images/mountain-lake.webp','images/earth-atlas.webp','images/earth-atlas.svg','apple-touch-icon.png'],'owner_authorization':'docs/original-image-restoration-20261105.md','withheld_media':['media/modus-introduksjon.mp4','audio/kick.mp3','audio/snare.mp3','audio/hihat.mp3']}
manifest.update({'kind':'modus-introduction-button-smaller','public_baseline_sha':'57ceefba809d733a76ef349d7cc473b99602315f','owner_authorization':'docs/approved-intro-film-20261105.txt','approved_film_sha256':'81eed15e5f0fa3c43ef0ba3130162bed23564621d68a9c96cf8f2fefcf4359b4','film_language':'nb','english_text_alternative':True,'deploy_authorized':False})
manifest['files']=[{'path':p.relative_to(O).as_posix(),'bytes':p.stat().st_size,'sha256':hash(p)} for p in sorted(O.rglob('*')) if p.is_file()]
(O/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in manifest.items() if k not in ['files','rights_replacements']}))

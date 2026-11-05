"""Exact restoration, constrained differences and unchanged article/private boundaries."""
from pathlib import Path
import json,hashlib,re
R=Path(__file__).resolve().parents[1];B=R.parent;P=B/'package';OLD=R.parents[1]/'p0-illustrations-20261105/package';I=R/'release-inputs/platform'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
images=['images/mountain-lake.webp','images/earth-atlas.webp','images/earth-atlas.svg','apple-touch-icon.png'];restored=[]
for pre in ['','en/']:
 for n in images:
  p=P/(pre+n);assert p.read_bytes()==(I/(pre+n)).read_bytes(),pre+n
  assert not any(line.startswith('/'+pre+n+' ') for line in (P/'_redirects').read_text().splitlines())
  restored.append({'path':pre+n,'sha256':h(p)})
 for folder in ['images/articles','images/teaching-diagrams']:
  for p in (OLD/pre/folder).glob('*.svg'):assert p.read_bytes()==(P/pre/folder/p.name).read_bytes(),p.name
 for n in ['article-quiz.js','articles.js']:
  assert (P/pre/n).read_bytes()==(OLD/pre/n).read_bytes(),pre+n
 assert json.loads((P/'cms-seed.json').read_text())==[]
 assert 'data-preview-unavailable' in (P/pre/'redaktor.html').read_text()
 for n in ['admin-app.js','editor.js','editor-admin.js','library-draft-backup.json']:assert not (P/pre/n).exists()
 for n in ['audio/kick.mp3','audio/snare.mp3','audio/hihat.mp3','media/modus-introduksjon.mp4']:assert '/'+pre+n+' /retired-media-resource 302' in (P/'_redirects').read_text()
changes=[];unchanged=0
for p in OLD.rglob('*'):
 if not p.is_file():continue
 n=p.relative_to(OLD).as_posix();q=P/n;assert q.exists(),n
 if p.read_bytes()==q.read_bytes():unchanged+=1;continue
 changes.append(n)
 if n in ['release-manifest.json','_redirects']:continue
 assert q.suffix in ['.html','.css','.js','.json'],n
 s=q.read_text().replace('images/mountain-lake.webp','images/mountain-original.svg').replace('images/earth-atlas.webp','images/atlas-original.svg').replace('images/earth-atlas.svg','images/atlas-original.svg').replace('apple-touch-icon.png','modus-identity-icon.svg')
 assert s==p.read_text(),n+' changes beyond original image references'
new=[p.relative_to(P).as_posix() for p in P.rglob('*') if p.is_file() and not (OLD/p.relative_to(P)).exists()]
assert set(new)=={pre+n for pre in ['','en/'] for n in images},new
m=json.loads((P/'release-manifest.json').read_text());assert m['deployment_authorized'] and m['restored_images']==images
for f in m['files']:assert h(P/f['path'])==f['sha256'],f['path']
report={'status':'passed','restored_images':restored,'baseline_unchanged_files':unchanged,'changed_files':changes,'all_article_and_teaching_diagram_bytes_unchanged':True,'all_quiz_and_private_boundary_bytes_unchanged':True,'new_files':new}
(B/'evidence/image-restoration-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if not isinstance(v,list)}))

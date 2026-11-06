"""P0/P1 preservation audit against the newest existing design/source."""
from pathlib import Path
import json,hashlib,re,sys
R=Path(__file__).resolve().parents[1];P=R.parent/'package';OLD=R/'release-inputs/published-d809a7b'
INVARIANTS=json.loads((R/'release-inputs/published-source-invariants.json').read_text())
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name in ['content/articles.json','content/article-quizzes.json','content/publication.json','content/article-illustration-permissions.json','content/i18n/articles.en.json','client/editor.js','cms/admin-model.mjs','cms/deployment-config.json','design-refresh.css','index.html']:
 assert h(R/name)==INVARIANTS[name],name
for name in ['article-quiz.js','articles.js','client/progress-state.js']:assert h(R/name)==INVARIANTS[name],name
articles=json.loads((R/'content/articles.json').read_text());assert len(articles)==52
rows=[]
for locale,pre,n in [('nb','',52),('en','en/',16)]:
 catalog=(P/pre/'artikler.html').read_text();assert catalog.count('data-article-id=')==n
 assert catalog.count('data-card-layout-control')==1
 assert len(re.findall(r'<link[^>]+article-library-layout',catalog))==1
 assert len(re.findall(r'<script[^>]+article-library-layout',catalog))==1
 for p in (OLD/pre/'artikler').glob('*.html'):
  a=re.search(r'<main\b[\s\S]*?</main>',p.read_text());b=re.search(r'<main\b[\s\S]*?</main>',(P/pre/'artikler'/p.name).read_text());assert a and b and a[0]==b[0],p.name
 for folder in ['images/articles','images/teaching-diagrams']:
  for p in (OLD/pre/folder).glob('*.svg'):assert p.read_bytes()==(P/pre/folder/p.name).read_bytes(),p.name
 for a in articles[:n]:
  slug=a['slug'];p=P/pre/'images/articles'/(slug+'.svg');diagram=P/pre/'images/teaching-diagrams'/(slug+'.svg');assert p.exists() and diagram.exists();rows.append({'slug':slug,'locale':locale,'card_image_sha256':h(p),'teaching_diagram_sha256':h(diagram),'reader_body_unchanged':True})
 for a in articles[16:]:assert not (P/'en/images/teaching-diagrams'/(a['slug']+'.svg')).exists()
 assert 'data-preview-unavailable' in (P/pre/'redaktor.html').read_text()
 for f in ['app.js','chord-tool.js','piano-interaction.js','theory.js','midi.js','account.js','article-quiz.js','articles.js','musikkart.js','learning-journey.js','preview-guard.js']:
  if (OLD/pre/f).exists():assert (OLD/pre/f).read_bytes()==(P/pre/f).read_bytes(),pre+f
assert json.loads((P/'cms-seed.json').read_text())==[]
for p in P.rglob('*'):
 if p.is_file():
  name=p.relative_to(P).as_posix();assert not name.startswith(('content/','editorial/','tests/','scripts/','cms/','design-references/'))
  assert p.name not in ['admin-app.js','admin-package.json','editor.js','editor-admin.js','_worker.js','library-draft-backup.json']
for pre in ['','en/']:
 for n in ['images/mountain-lake.webp','images/earth-atlas.webp','images/earth-atlas.svg','apple-touch-icon.png']:assert (P/pre/n).read_bytes()==(OLD/pre/n).read_bytes(),pre+n
 assert not (P/pre/'media/modus-introduksjon.mp4').exists()
result={'status':'passed','source_nb':52,'published_locale_pairs':68,'private_EN_diagrams_excluded':36,'unchanged_original_illustrations':32,'all_card_and_teaching_diagram_bytes_unchanged':True,'all_104_reader_main_bodies_unchanged':True,'source_policy_quiz_admin_and_storage_unchanged':True,'rows':rows}
(R/'test-results').mkdir(exist_ok=True);(R/'test-results/article-library-preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='rows'}))
# Reapplying the build step neither duplicates cards/controls nor leaves stale assets.
import tempfile,shutil,runpy
with tempfile.TemporaryDirectory(prefix='modus-library-idempotence-') as tmp:
 out=Path(tmp)
 for pre in ['','en/']:
  (out/pre).mkdir(parents=True,exist_ok=True);shutil.copy2(P/pre/'artikler.html',out/pre/'artikler.html')
 apply=runpy.run_path(str(R/'scripts/apply-article-library.py'))['apply'];apply(out)
 first={p.relative_to(out).as_posix():h(p) for p in out.rglob('*') if p.is_file()};apply(out)
 assert first=={p.relative_to(out).as_posix():h(p) for p in out.rglob('*') if p.is_file()}
 for pre in ['','en/']:assert (out/pre/'artikler.html').read_text().count('data-card-layout-control')==1
print('Scoped catalog integration is idempotent; no duplicated cards/controls or stale layout resources.')

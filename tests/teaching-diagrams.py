"""Independent pitch oracle, renderer geometry, source integrity and private boundary."""
from pathlib import Path
import json,sys,re,hashlib,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'scripts'))
from teaching_diagram_specs import SPECS
from teaching_diagrams import pitch,degree,svg
INVARIANTS=json.loads((R/'release-inputs/published-source-invariants.json').read_text())
# Preserve every original paragraph, quiz, translation and publication/version decision.
for n in ['content/articles.json','content/article-quizzes.json','content/publication.json','content/article-illustration-permissions.json','content/i18n/articles.en.json','cms/deployment-config.json','client/editor.js','cms/admin-model.mjs']:
 assert hashlib.sha256((R/n).read_bytes()).hexdigest()==INVARIANTS[n],n
oracle={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'Fb':4,'E#':5,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':-1,'B#':12}
def midi(n):
 m=re.fullmatch(r'([A-G][#b]*)(\d)',n);return oracle[m[1]]+12*(int(m[2])+1)
def d(n):return 'CDEFGAB'.index(n[0])+7*int(n[-1])
checks=0;ns={'s':'http://www.w3.org/2000/svg'};M=json.loads((R/'editorial/teaching-diagrams/manifest.json').read_text());assert len(M['articles'])==52
for slug,title,panels in SPECS:
 for p in panels:
  for n in p.get('notes',[]):assert pitch(n)==midi(n) and degree(n)==d(n);checks+=1
  for st,fr,n in p.get('positions',[]):assert [64,59,55,50,45,40][st-1]+fr==midi(n),(slug,st,fr,n);checks+=1
  if p['kind']=='staff':assert len(p.get('durations') or [1]*len(p['notes']))==len(p['notes'])
 for loc in ['nb','en']:
  for compact in [False,True]:
   data=svg((slug,title,panels),loc,compact);e=ET.fromstring(data);assert e.find('s:title',ns).text and e.find('s:desc',ns).text
   assert not re.search(r'<(?:script|foreignObject)|(?:href|onload)=',data)
   pp=panels[:1] if compact else panels
   piano=[p for p in pp if p['kind']=='piano'];groups=[g for g in e.findall('s:g',ns)]
   for p,g in zip(pp,groups):
    if p['kind']=='piano':
     keys=g.findall('s:rect[@data-midi]',ns);assert len({int(k.attrib['data-midi']) for k in keys})==len(keys)
     marked={int(k.attrib['data-midi']) for k in keys if k.attrib['fill'] in ['#d9ef8b','#80d6c5']};assert marked=={midi(n) for n in p['notes']}
     for key in keys:
      black=int(key.attrib['data-midi'])%12 in [1,3,6,8,10];assert float(key.attrib['height'])==(78 if black else 125)
    if p['kind']=='staff':
     notes=g.findall('s:ellipse[@data-note]',ns);assert [n.attrib['data-note'] for n in notes]==p['notes'];bass=max(midi(n) for n in p['notes'])<=60;base=d('G2' if bass else 'E4')
     for n in notes:assert int(n.attrib['data-diatonic'])==d(n.attrib['data-note'])-base
# Explicit musical facts, independent from renderer formulas.
A={s[0]:s[2] for s in SPECS}
def offsets(slug,panel=0):
 n=A[slug][panel]['notes'];return [midi(x)-midi(n[0]) for x in n]
assert offsets('toner-og-intervaller')==[0,4];assert offsets('toner-og-intervaller',1)==[0,3]
assert offsets('intervallomvendinger')==[0,4];assert offsets('intervallomvendinger',1)==[0,8]
assert d('E4')-d('C4')+1+d('C5')-d('E4')+1==9
assert offsets('dur-og-moll')==[0,4,7];assert offsets('dur-og-moll',1)==[0,3,7]
assert offsets('septimakkorder')==[0,4,7,11];assert offsets('septimakkorder',1)==[0,4,7,10];assert offsets('septimakkorder',2)==[0,3,7,10]
assert offsets('harmonisk-moll-og-frygisk-dominant')==[0,2,3,5,7,8,11]
assert offsets('harmonisk-moll-og-frygisk-dominant',1)==[0,1,4,5,7,8,10]
assert offsets('dorisk-og-eolisk')==[0,2,3,5,7,8,10];assert offsets('dorisk-og-eolisk',1)==[0,2,3,5,7,9,10]
assert offsets('melodisk-moll-og-akkordskala')==[0,2,3,5,7,9,11];assert offsets('melodisk-moll-og-akkordskala',1)==[0,2,4,6,7,9,10]
assert offsets('altererte-dominanter-og-symmetriske-skalaer')==[0,1,3,4,6,8,10]
for panel,steps in [(1,[2]*6),(2,[1,2]*4)]:
 n=offsets('altererte-dominanter-og-symmetriske-skalaer',panel)+[12];assert [b-a for a,b in zip(n,n[1:])]==steps
assert midi('F#4')-midi('Ab3')==10 and d('F#4')-d('Ab3')+1==6
assert midi('Cb4')==midi('B3');assert (midi('B3')-midi('F3'))%12==6
assert [midi(b)-midi(a) for a,b in [('B3','C4'),('F3','E3'),('D3','C3'),('G2','C3')]]==[1,-1,-2,5]
low=[midi(n) for n in A['kontrapunkt-to-selvstendige-stemmer'][1]['notes']];high=[midi(n) for n in A['kontrapunkt-to-selvstendige-stemmer'][0]['notes']];assert [h-l for h,l in zip(high,low)]==[12,9,3,9,12]
assert [midi(n) for n in A['motiv-og-transformasjon'][1]['notes']]==[midi(n)+2 for n in A['motiv-og-transformasjon'][0]['notes']]
assert 90*3/2==135
assert [midi('Bb3')-midi('C4'),midi('F3')-midi('C4'),midi('C3')-midi('C4')]==[-2,-7,-12]
for a in M['articles'][:16]:
 for loc,pre in [('nb',''),('en','en/')]:
  assert (R/'dist'/pre/'images/articles'/(a['slug']+'.svg')).read_bytes()==(R/'editorial/catalog-illustrations'/loc/(a['slug']+'.svg')).read_bytes()
for a in M['articles'][16:]:assert not (R/'dist/en/images/teaching-diagrams'/(a['slug']+'.svg')).exists()
assert len(list((R/'dist/images/teaching-diagrams').glob('*.svg')))==104
assert len(list((R/'dist/en/images/teaching-diagrams').glob('*.svg')))==32
out={'status':'passed','articles':52,'original_approved_images_preserved':32,'note_and_guitar_checks':checks,'standalone_svg_variants':208,'private_english_diagrams_excluded':36,'source_text_quiz_policy_admin_unchanged':True}
(R/'test-results/teaching-diagrams-music.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
# A dirty candidate must not retain its new diagrams after permission is withdrawn.
import tempfile,shutil,importlib.util
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('diagram_integration',R/'scripts/integrate-teaching-diagrams.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
original=module.public_articles;denied=SPECS[16][0];report=(R/'test-results/diagram-integration.json').read_bytes()
try:
 with tempfile.TemporaryDirectory(prefix='modus-diagram-negative-') as tmp:
  target=Path(tmp)/'dist';shutil.copytree(R/'dist',target)
  with patch.object(module,'public_articles',lambda root,locale:[a for a in original(root,locale) if a['slug']!=denied]):module.integrate(target)
  assert 'data-teaching-diagram' not in (target/'artikler'/(denied+'.html')).read_text()
  assert not (target/'images/teaching-diagrams'/(denied+'.svg')).exists()
  assert (target/'images/articles'/(denied+'.svg')).read_bytes()==(R/'editorial/catalog-illustrations/nb'/(denied+'.svg')).read_bytes()
finally:(R/'test-results/diagram-integration.json').write_bytes(report)
print('Dirty-artifact withdrawal: diagram removed, reader held, independent authorized historical image restored; no policy mutation.')

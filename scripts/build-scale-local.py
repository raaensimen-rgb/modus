"""Local-only scale QA package. No publication-policy changes or deployment."""
from pathlib import Path
import shutil, json, hashlib, subprocess
R=Path(__file__).resolve().parents[1]; O=R.parent/'package'
B=R/'release-inputs/published-d809a7b'
expected=json.loads((R/'release-inputs/published-d809a7b-files.json').read_text())
assert {p.relative_to(B).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in B.rglob('*') if p.is_file()}==expected
if O.exists():shutil.rmtree(O)
shutil.copytree(B,O)
# Carry forward the approved local Pakke A navigation correction.
import re, os
from site_navigation import add_scale_library_link
nav=(R/'navigation.js').read_bytes();asset='navigation.'+hashlib.sha256(nav).hexdigest()[:10]+'.js'
for pre in ('','en/'):
 (O/pre/'navigation.js').write_bytes(nav);(O/pre/asset).write_bytes(nav)
for p in O.rglob('*.html'):
 before=p.read_bytes();after=re.sub(rb'navigation\.[a-f0-9]{10}\.js',asset.encode(),before)
 if before!=after:p.write_bytes(after)

# Preserve published design; transfer only explicitly selected source deltas.
for pre in ('','en/'):
 for name in ('scale-model.js','scale-library.js','scale-library.css'):
  shutil.copy2(R/name,O/pre/name)
 for name in ('teori.html','musikkart.html'):
  p=O/pre/name;s=p.read_text()
  if name=='teori.html':s=s.replace('<script src="theory.js', '<script src="scale-model.js"></script><script src="theory.js')
  else:s=s.replace('<section class="map-next">','<p><a href="skalabibliotek.html">'+('Interactive Scale Library' if pre else 'Interaktivt Skalabibliotek')+' ↗</a></p><section class="map-next">')
  p.write_text(s)
 p=O/pre/'theory.js';s=p.read_text();start=s.index('function spellFrom(');end=s.index('\nfunction scaleNames',start);p.write_text(s[:start]+'const spellFrom=window.ModusScales.spell;'+s[end:])
 # Current shared header/footer, with only the new main content from source.
 shell=(O/pre/'musikkart.html').read_text();page=(R/'skalabibliotek.html').read_text();main=page[page.index('<main'):page.index('</main>')+7]
 if pre:main=main.replace('Skalabibliotek','Scale library').replace('Musikkatlas','Music atlas')
 a=shell.index('<main');b=shell.index('</main>',a)+7
 shell=shell[:a]+main+shell[b:]
 shell=shell.replace('</head>','<link rel="stylesheet" href="scale-library.css"></head>')
 import re
 shell=re.sub(r'<script src="musikkart.js[^\"]*" defer></script>','<script src="theory-data.js"></script><script src="scale-model.js"></script><script src="scale-library.js" defer></script>',shell)
 shell=re.sub(r'<title>.*?</title>','<title>MODUS · '+('Scale library' if pre else 'Skalabibliotek')+'</title>',shell)
 (O/pre/'skalabibliotek.html').write_text(shell)
# Apply the shared destination on every existing public header, including article readers.
for p in O.rglob('*.html'):
 locale_root=O/'en' if p.relative_to(O).parts[0]=='en' else O
 prefix=os.path.relpath(locale_root,p.parent).replace(os.sep,'/');prefix='' if prefix=='.' else prefix+'/'
 p.write_text(add_scale_library_link(p.read_text(),prefix,english=p.relative_to(O).parts[0]=='en',active=p.name=='skalabibliotek.html'))
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old={p.relative_to(B).as_posix():h(p) for p in B.rglob('*') if p.is_file()};new={p.relative_to(O).as_posix():h(p) for p in O.rglob('*') if p.is_file()}
changed=sorted(n for n in old if new.get(n)!=old[n]);added=sorted(set(new)-set(old))
assert all(n.endswith('.html') or n in ('navigation.js','en/navigation.js','theory.js','en/theory.js') for n in changed)
assert added==sorted(pre+n for pre in ('','en/') for n in ('scale-model.js','scale-library.js','scale-library.css','skalabibliotek.html',asset))
manifest={'kind':'local-scale-qa-only','deploy_authorized':False,'source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'changed':changed,'added':added,'preserved':len(old)-len(changed),'files':{n:v for n,v in new.items() if n!='release-manifest.json'}}
(O/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k!='files'},indent=2))

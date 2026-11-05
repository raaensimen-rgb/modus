"""Shared design integration into the existing public artifact; no permission changes."""
from pathlib import Path
import hashlib,os,re,shutil,sys
R=Path(__file__).resolve().parents[1]
def apply(target):
 target=Path(target).resolve()
 if target==R or not (target/'index.html').is_file():raise ValueError('Expected built public artifact')
 css=(R/'design-refresh.css').read_bytes();name='design-refresh.'+hashlib.sha256(css).hexdigest()[:10]+'.css'
 assets=['modus-design-landscape.png','modus-design-tools.png','modus-design-articles.png','modus-design-studies-v2.png','modus-design-diamond.svg','modus-continuous-wave.svg']
 for pre in ['', 'en/']:
  (target/pre/'images').mkdir(parents=True,exist_ok=True)
  (target/pre/name).write_bytes(css)
  for asset in assets:shutil.copy2(R/'images'/asset,target/pre/'images'/asset)
 for p in target.rglob('*.html'):
  page=p.read_text();
  if 'en' in p.relative_to(target).parts:
   page=page.replace('>Verktøy<span','>Tools<span').replace('>Musikkatlas<span','>Music atlas<span').replace('MUSIKKTEORI · SPILL · VERKTØY · SKAP','MUSIC THEORY · PLAY · TOOLS · CREATE')
  prefix=os.path.relpath(target,p.parent).replace(os.sep,'/');prefix='' if prefix=='.' else prefix+'/'
  page=re.sub(r'<link rel="stylesheet" href="(?:\.\./)?design-refresh(?:\.[a-f0-9]{10})?\.css">','',page)
  page=page.replace('</head>',f'<link rel="stylesheet" href="{prefix}{name}"></head>',1)
  p.write_text(page)
 print('Integrated shared reference design:',name)
if __name__=='__main__':apply(Path(sys.argv[1]) if len(sys.argv)>1 else R/'dist')

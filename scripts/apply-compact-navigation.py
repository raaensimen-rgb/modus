"""One shared owner-approved compact header style for public pages."""
from pathlib import Path
import hashlib,os,re,sys
R=Path(__file__).resolve().parents[1]
def apply(target):
 target=Path(target).resolve();data=(R/'compact-navigation.css').read_bytes();name='compact-navigation.'+hashlib.sha256(data).hexdigest()[:10]+'.css'
 for pre in ['', 'en/']:(target/pre/name).write_bytes(data)
 count=0
 for p in target.rglob('*.html'):
  s=p.read_text()
  if '<header class="site-header">' not in s or p.name=='redaktor.html':continue
  prefix=os.path.relpath(target,p.parent).replace(os.sep,'/');prefix='' if prefix=='.' else prefix+'/'
  s=re.sub(r'<link rel="stylesheet" href="[^"<>]*compact-navigation[^"<>]*">','',s)
  s=s.replace('</head>',f'<link rel="stylesheet" href="{prefix}{name}"></head>',1)
  p.write_text(s);count+=1
 print('Shared compact navigation:',count,'public pages;',name)
if __name__=='__main__':apply(Path(sys.argv[1]) if len(sys.argv)>1 else R/'dist')

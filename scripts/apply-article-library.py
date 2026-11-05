"""Scoped P0/P1 catalog presentation; no article, permission or storage mutation."""
from pathlib import Path
import hashlib,re,shutil,sys
R=Path(__file__).resolve().parents[1]
def apply(target):
 target=Path(target).resolve()
 for pre,labels in [('',('Kortvisning','Rutenett','Liste')),('en/',('Card layout','Grid','List'))]:
  root=target/pre;page=root/'artikler.html';s=page.read_text()
  assets=[]
  for ext in ['css','js']:
   src=R/('article-library-layout.'+ext);name='article-library-layout.'+hashlib.sha256(src.read_bytes()).hexdigest()[:10]+'.'+ext
   # Keep stale output out of future artifact inventories.
   for old in root.glob('article-library-layout.*.'+ext):old.unlink()
   shutil.copy2(src,root/name);assets.append(name)
  s=re.sub(r'<link rel="stylesheet" href="article-library-layout\.[a-f0-9]{10}\.css">','',s)
  s=re.sub(r'<script src="article-library-layout\.[a-f0-9]{10}\.js" defer></script>','',s)
  s=re.sub(r'<div class="card-layout-control"[\s\S]*?<!-- /card-layout-control -->','',s)
  title,grid,list_label=labels
  control=f'<div class="card-layout-control" data-card-layout-control hidden><span>{title}</span><div role="group" aria-label="{title}"><button type="button" data-card-layout-choice="grid" aria-pressed="true" aria-controls="articleGroups">{grid}</button><button type="button" data-card-layout-choice="list" aria-pressed="false" aria-controls="articleGroups">{list_label}</button></div></div><!-- /card-layout-control -->'
  marker='<div class="library-controls">';assert marker in s
  s=s.replace(marker,marker+control,1)
  s=s.replace('</head>',f'<link rel="stylesheet" href="{assets[0]}"><script src="{assets[1]}" defer></script></head>',1)
  page.write_text(s)
 print('Integrated compact 1/2/3/4-column catalog and Grid/List controls; article sources and permissions unchanged.')
if __name__=='__main__':apply(Path(sys.argv[1]) if len(sys.argv)>1 else R/'dist')

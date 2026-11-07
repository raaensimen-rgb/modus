"""A06: bounded responsive photographs on four reviewed pages; no runtime JS."""
from pathlib import Path
import hashlib,json,re,shutil
R=Path(__file__).resolve().parents[1]
PAGES=('index.html','en/index.html','artikler.html','en/artikler.html')
PREFIX='/images/a06/'

def lock():
 c=json.loads((R/'release-inputs/a06-images.json').read_text())
 for name,expected in c['sources'].items():
  assert hashlib.sha256((R/'release-inputs/production-584c98f/images'/name).read_bytes()).hexdigest()==expected,'Original image changed'
 expected={n:v['sha256'] for n,v in c['files'].items()}
 actual={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (R/'release-inputs/a06-images').iterdir() if p.is_file()}
 assert actual==expected,'Responsive image inputs changed'
 return c

def picture(match,home):
 tag=match[0];name=re.search(r'images/(modus-design-[a-z0-9-]+)\.png',tag)[1]
 widths=[384,768,1152,1536] if name=='modus-design-landscape' else [384,768]
 sizes=('(max-width: 760px) 768px, 100vw' if home else '100vw') if name=='modus-design-landscape' else '(max-width: 1100px) 320px, 22vw'
 srcset=lambda ext:', '.join(PREFIX+name+'-'+str(w)+'.'+ext+' '+str(w)+'w' for w in widths)
 # Existing original src, alt, loading/fetchpriority and dimensions are retained.
 reuse=home and name=='modus-design-landscape' and 'loading="lazy"' in tag
 if reuse:tag=tag.replace('loading="lazy"','loading="eager"')
 img=tag[:-1]+' srcset="'+srcset('jpg')+'" sizes="'+sizes+'">'
 return '<picture data-a06-photo="'+name+'"'+(' data-a06-critical-reuse=""' if reuse else '')+'><source type="image/webp" srcset="'+srcset('webp')+'" sizes="'+sizes+'">'+img+'</picture>'

def css():
 # Keep the existing gradient/crop, but use one HTML image request destination in
 # both engines. WebKit fetched the same URL twice when shared by CSS and HTML.
 return ('<style id="a06-images">'
 '.modus-home .landscape>picture,.modus-interior .library-hero .articles-landscape>picture{display:block;width:100%;height:100%}'
 '.modus-home .home-portal>picture{position:absolute;inset:0;width:100%;height:100%;z-index:-2;opacity:.9}'
 '.modus-home .home-portal>picture>img{display:block;width:100%;height:100%;object-fit:cover}'
 '.modus-interior .library-hero .articles-landscape{background-image:none!important}'
 '.modus-home .new-philosophy{background-image:none!important}'
 '.modus-home .new-philosophy>picture[data-a06-background]{display:block;position:absolute;inset:0;width:100%;height:100%;z-index:-1}'
 '.modus-home .new-philosophy>picture[data-a06-background]>img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 70%}'
 '.modus-home .new-philosophy>picture[data-a06-background]::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,25,23,.5),#001917 92%)}'
 'html:is([data-theme=readable],[data-theme=contrast]) .modus-home .new-philosophy>picture[data-a06-background]{display:none}'
 '@media(forced-colors:active){.modus-home .new-philosophy>picture[data-a06-background]{display:none}}'
 '</style>')

def apply(package):
 c=lock();destination=package/'images/a06';destination.mkdir(parents=True,exist_ok=True)
 for n in c['files']:shutil.copyfile(R/'release-inputs/a06-images'/n,destination/n)
 for n in PAGES:
  p=package/n;s=p.read_text();assert 'a06-images' not in s,'Do not apply image optimization twice'
  s=re.sub(r'<img\b[^>]*src="images/modus-design-(?:landscape|studies-v2|tools|articles)\.png"[^>]*>',lambda m:picture(m,n.endswith('index.html')),s)
  if n.endswith('index.html'):
   tag='<img src="images/modus-design-landscape.png" width="1536" height="1024" alt="" loading="lazy">'
   photo=picture(re.match(r'.*',tag),True).replace('<picture ','<picture data-a06-background="" aria-hidden="true" ',1)
   s,count=re.subn(r'<section[^>]*class="home-philosophy new-philosophy"[^>]*>',lambda m:m[0]+photo,s,count=1);assert count==1
  # Insert before linked CSS to suppress redundant background fetches on both locales.
  s,count=re.subn(r'<meta charset="[^"]+">',lambda m:m[0]+css(),s,count=1);assert count==1
  p.write_text(s)

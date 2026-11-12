"""Deterministic, original SVG teaching diagrams; no generated notation bitmaps."""
from pathlib import Path
import json,re,html,hashlib,sys,textwrap,xml.etree.ElementTree as ET
from teaching_diagram_specs import SPECS
ROOT=Path(__file__).resolve().parents[1]
NAT={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
OPEN={1:64,2:59,3:55,4:50,5:45,6:40}
BG='#12231f'; PANEL='#1c332d'; FG='#edf3df'; LIME='#d9ef8b'; TEAL='#80d6c5'; MUTED='#b5cbc2'
def esc(x):return html.escape(str(x),quote=True)
def pitch(n):
 m=re.fullmatch(r'([A-G])([#b]*)(-?\d+)',n)
 if not m:raise ValueError(n)
 letter,acc,octave=m.groups();return (int(octave)+1)*12+NAT[letter]+acc.count('#')-acc.count('b')
def degree(n):
 m=re.fullmatch(r'([A-G])([#b]*)(-?\d+)',n);return int(m[3])*7+'CDEFGAB'.index(m[1])
def name(n):return n.replace('#','♯').replace('b','♭')
def label(x,y,s,size=24,color=FG,anchor='start',weight=400):
 return f'<text x="{x}" y="{y}" fill="{color}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{esc(s)}</text>'
def lines(s,width=40):return textwrap.wrap(s,width=width,break_long_words=False,break_on_hyphens=False) or ['']
def panel(p,locale):
 title=p['title'][locale]; header=lines(title,42); y=30
 s=f'<rect x="0" y="0" width="552" height="HEIGHT" rx="16" fill="{PANEL}" stroke="#4e7065"/>'
 for t in header:s+=label(20,y,t,22,LIME,weight=600);y+=28
 y+=16;kind=p['kind']
 if kind=='flow':
  for i,row in enumerate(p['rows']):
   rows=lines(row[locale],42);h=24+28*len(rows)
   s+=f'<rect x="16" y="{y}" width="520" height="{h}" rx="8" fill="{BG}"/>'+label(30,y+31,f'{i+1:02}',17,TEAL)
   for j,t in enumerate(rows):s+=label(70,y+31+28*j,t,21)
   y+=h+12
 elif kind=='crossrhythm':
  for row,(tag,hits) in enumerate([('3',[0,2,4]),('2',[0,3])]):
   yy=y+row*68;s+=label(20,yy+29,tag,24,TEAL)
   for i in range(6):
    x=88+i*80;s+=f'<circle cx="{x}" cy="{yy+20}" r="{15 if i in hits else 5}" fill="{LIME if i in hits else MUTED}"/>'+label(x,yy+51,i+1,18,MUTED,'middle')
  y+=169;s+=label(26,y,('Seks like lange underenheter' if locale=='nb' else 'Six equally spaced subdivisions'),21,TEAL);y+=18
 elif kind=='rhythm':
  groups=p['groups'];n=sum(groups);w=500/n;x=26;idx=0
  for gi,g in enumerate(groups):
   s+=f'<rect x="{x}" y="{y}" width="{w*g-6}" height="100" rx="8" fill="{BG}" stroke="{TEAL if gi%2 else LIME}"/>'
   for j in range(g):
    cx=x+w*(j+.5)-3;s+=f'<circle cx="{cx}" cy="{y+34}" r="{13 if j==0 else 7}" fill="{LIME if j==0 else MUTED}"/>'+label(cx,y+78,idx+j+1,23,FG,'middle')
   idx+=g;x+=w*g
  y+=135;s+=label(26,y,('Store punkter = gruppestart' if locale=='nb' else 'Large dots = group starts'),21,TEAL);y+=18
 elif kind=='piano':
  notes=p['notes'];values=[pitch(n) for n in notes];low=min(values)//12*12;high=(max(values)//12+1)*12-1
  white=[m for m in range(low,high+1) if m%12 in NAT.values()];w=500/len(white);xs={m:26+i*w for i,m in enumerate(white)}
  for m in white:
   s+=f'<rect data-midi="{m}" x="{xs[m]}" y="{y}" width="{w-1}" height="125" rx="2" fill="{LIME if m in values else "#f3f1df"}" stroke="#12231f"/>'
   if m in values:s+=f'<circle cx="{xs[m]+w/2}" cy="{y+102}" r="6" fill="{BG}"/>'
  for m in range(low,high+1):
   if m%12 in NAT.values():continue
   x=xs[m-1]+w*.68
   s+=f'<rect data-midi="{m}" x="{x}" y="{y}" width="{w*.60}" height="78" rx="2" fill="{TEAL if m in values else "#07120f"}" stroke="#12231f"/>'
   if m in values:s+=f'<circle cx="{x+w*.30}" cy="{y+61}" r="4" fill="{BG}"/>'
  y+=158
  # Spelled note names retain enharmonic function; octaves disambiguate duplicates.
  for t in lines(' · '.join(name(n) for n in notes),39):s+=label(26,y,t,23);y+=30
  s+=label(26,y,('Markerte tangenter · klingende tonehøyde' if locale=='nb' else 'Marked keys · sounding pitch'),18,MUTED);y+=18
 elif kind=='staff':
  notes=p['notes'];dur=p.get('durations') or [1]*len(notes);bass=max(pitch(n) for n in notes)<=60
  base=degree('G2' if bass else 'E4');ds=[degree(n)-base for n in notes]
  # Five lines at diatonic coordinates 0,2,4,6,8; adapt to ledger lines.
  top=max(8,max(ds));bottom=min(0,min(ds));step=7;baseline=y+24+top*step
  for d in [0,2,4,6,8]:
   yy=baseline-d*step;s+=f'<path d="M65 {yy} H526" stroke="{MUTED}" stroke-width="1.3"/>'
  s+=label(20,baseline-13,'𝄢' if bass else '𝄞',54,FG)
  for i,(n,duration) in enumerate(zip(notes,dur)):
   x=96+i*400/max(1,len(notes)-1);d=degree(n)-base;yy=baseline-d*step
   ledger=range(10,d+1,2) if d>=10 else range(-2,d-1,-2) if d<=-2 else []
   for ld in ledger:s+=f'<path d="M{x-16} {baseline-ld*step} h32" stroke="{FG}"/>'
   s+=f'<ellipse data-note="{esc(n)}" data-diatonic="{d}" cx="{x}" cy="{yy}" rx="10" ry="7" transform="rotate(-16 {x} {yy})" fill="{BG if duration>=2 else LIME}" stroke="{LIME}" stroke-width="2"/>'
   if '#' in n or 'b' in n:s+=label(x-26,yy+6,'♯' if '#' in n else '♭',25,FG,'middle')
   if duration<4:
    stemup=d<4; xx=x+(9 if stemup else -9);end=yy+(-43 if stemup else 43)
    s+=f'<path d="M{xx} {yy} V{end}" stroke="{LIME}" stroke-width="2"/>'
    if duration==.5:s+=f'<path d="M{xx} {end} q{18 if stemup else -18} {16 if stemup else -16} 4 {28 if stemup else -28}" fill="none" stroke="{LIME}" stroke-width="3"/>'
  y=baseline-bottom*step+47
  for t in lines(' → '.join(name(n) for n in notes),42):s+=label(26,y,t,22);y+=29
  s+=label(26,y,('Klingende noter · uten faste fortegn' if locale=='nb' else 'Sounding notes · no key signature'),18,MUTED);y+=18
 elif kind=='guitar':
  pos=p['positions'];lo=min(z[1] for z in pos);hi=max(z[1] for z in pos);lo=max(0,lo-1);hi=max(lo+3,hi);w=456/(hi-lo+1)
  for f in range(lo,hi+1):
   x=70+(f-lo)*w;s+=f'<path d="M{x} {y+25} v150" stroke="#738f82"/>'+label(x+w/2,y+12,f,18,MUTED,'middle')
  for string in range(1,7):
   yy=y+35+(string-1)*26;s+=f'<path d="M70 {yy} H526" stroke="{MUTED}" stroke-width="{1+string*.16}"/>'+label(20,yy+6,f'{string}',19,FG)
  seen=set()
  for string,fret,n in pos:
   if (string,fret) in seen:continue
   seen.add((string,fret));x=70+(fret-lo+.5)*w;yy=y+35+(string-1)*26
   s+=f'<circle data-string="{string}" data-fret="{fret}" data-note="{esc(n)}" cx="{x}" cy="{yy}" r="12" fill="{LIME}"/>'
  y+=207
  for t in lines(' → '.join(name(n) for _,_,n in pos),40):s+=label(26,y,t,22);y+=28
  s+=label(26,y,('Streng 1 øverst · båndnumre over' if locale=='nb' else 'String 1 at top · fret numbers above'),18,MUTED);y+=27
  s+=label(26,y,'E2–A2–D3–G3–B3–E4',18,TEAL);y+=18
 else:raise ValueError(kind)
 height=y+22;return s.replace('HEIGHT',str(height)),height

def transcript(spec,locale):
 _,title,panels=spec;out=[title[locale]]
 for p in panels:
  s=p['title'][locale]+': '
  if p['kind'] in ['piano','staff']:s+=' → '.join(name(n) for n in p['notes'])
  elif p['kind']=='flow':s+='; '.join(r[locale] for r in p['rows'])
  elif p['kind']=='guitar':s+='; '.join((f'streng {st}, bånd {fr}: ' if locale=='nb' else f'string {st}, fret {fr}: ')+name(n) for st,fr,n in p['positions'])
  elif p['kind']=='crossrhythm':s+=('trelag på 1, 3, 5; tolag på 1, 4; seks like underenheter' if locale=='nb' else 'three at 1, 3, 5; two at 1, 4; six equal subdivisions')
  else:s+='+'.join(map(str,p['groups']))+(' åttendedeler; aksent på ' if locale=='nb' else ' eighths; accents on ')+', '.join(str(1+sum(p['groups'][:i])) for i in range(len(p['groups'])))
  out.append(s)
 return out

def svg(spec,locale,compact=False):
 slug,title,panels=spec;parts=[];y=100
 for p in (panels[:1] if compact else panels):
  s,h=panel(p,locale);parts.append(f'<g transform="translate(24 {y})">{s}</g>');y+=h+16
 h=y+38;desc=' '.join(transcript(spec,locale));heading=title[locale]
 out=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 {h}" role="img" aria-labelledby="title desc" lang="{locale}"><title id="title">{esc(heading)}</title><desc id="desc">{esc(desc)}</desc><rect width="600" height="{h}" rx="20" fill="{BG}"/>'
 out+=label(24,29,'MODUS / '+('SPILL OG FORSTÅ' if locale=='nb' else 'PLAY AND UNDERSTAND'),15,TEAL,weight=600)
 for i,t in enumerate(lines(heading,43)):out+=label(24,59+26*i,t,23,FG,weight=600)
 out+=''.join(parts)+f'<path d="M480 {h-15} l16 -12 16 12 16 -12 16 12" stroke="{TEAL}" fill="none" stroke-width="1.5" opacity=".65"/></svg>'
 return out

def generate():
 articles=json.loads((ROOT/'content/articles.json').read_text());assert len(SPECS)==len(articles)
 manifest={'schema_version':1,'source_article_count':len(articles),'source_basis':'cf1258793e8eb28cf49683cf9a020948a48ed764','original_work':True,'academic_status':'technical and bounded music checks; not final academic approval','articles':[]}
 out=ROOT/'editorial/teaching-diagrams';out.mkdir(exist_ok=True)
 for i,(a,spec) in enumerate(zip(articles,SPECS)):
  assert a['slug']==spec[0],(i,a['slug'],spec[0]);entry={'slug':a['slug'],'title':a['title'],'source_sections':[s[0] for s in a['sections']],'existing_art':a['art'],'reuse_existing_approved':i<16,'locales':{}}
  for loc in ['nb','en']:
   d=out/loc;d.mkdir(exist_ok=True);files={}
   for suffix,compact in [('',False),('-card',True)]:
    f=d/(a['slug']+suffix+'.svg');f.write_text(svg(spec,loc,compact));ET.fromstring(f.read_text());files['card' if compact else 'diagram']={'path':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
   entry['locales'][loc]={'title':spec[1][loc],'transcript':transcript(spec,loc),'assets':files,'article_available':loc=='nb' or i<16}
  manifest['articles'].append(entry)
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(f'Generated {2*len(articles)} teaching diagrams and compact card variants.')
if __name__=='__main__':generate()

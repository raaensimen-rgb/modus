from pathlib import Path
import json,math,re,html
from site_navigation import render_header, with_navigation_css
from article_library import TOPICS, ORDER, render_library
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist';ARTICLES=json.loads((ROOT/'content/articles.json').read_text())
QUIZZES=json.loads((ROOT/'content/article-quizzes.json').read_text())
LEVELS={'beginner':('Nybegynner','Start med byggesteinene.'),'intermediate':('Videre','Se de større sammenhengene.'),'advanced':('Fordypning','Utforsk flere nyanser.')}
ALT={'circle':'Kvintsirkelen med durtonearter ytterst, relativ moll innenfor og antall faste fortegn. Med klokken: C, G, D, A, E, B, F♯ eller G♭, D♭, A♭, E♭, B♭, F.', 'intervals':'C og G, en ren kvint med sju halvtoners avstand','triads':'C-dur med C E G sammenlignet med C-moll med C E♭ G', 'triadfamily':'Treklangstyper fra C: C E G, C E♭ G, C E♭ G♭ og C E G♯ med formler og intervallkvaliteter','melody':'En enkel melodisk frase med E G B og en pause','modes':'E dorisk med stor sekst C♯ fremhevet', 'sevenmodes':'De sju diatoniske modusene fra ett C-dur-tonemateriale: C ionisk, D dorisk, E frygisk, F lydisk, G miksolydisk, A eolisk og B lokrisk','romans':'Romertallene I, ii, iii, IV, V, vi og vii° under de sju akkordene C, Dm, Em, F, G, Am og Bdim i C-dur','cadence':'Dm7 G7 Cmaj7 med romertall ii7 V7 Imaj7','sevenths':'Cmaj7 bygget av C E G B, trinnene 1 3 5 7','harmonic':'A harmonisk moll og E frygisk dominant med samme toner og ulikt sentrum','voices':'C E G beholdes mens B går til A, fra Cmaj7 til Am7/C','rhythm':'Sju åttendedeler gruppert som to pluss to pluss tre'}
ALT.update({'diatonic':'G-durtreklanger bygget fra G-durskalaen: G, Am, Bm, C, D, Em og F♯dim.','targets':'Akkordtonene i Em, C, G og D ligger i ett felles toneutvalg.','parallel':'E eolisk og E dorisk sammenlignet med C og C♯ fremhevet.'})
def esc(s):return html.escape(str(s),quote=True)
def txt(x,y,s,size=24,color='#dce9cd',weight=500,anchor='middle'):
 return f'<text x="{x}" y="{y}" text-anchor="{anchor}" fill="{color}" font-family="Arial,sans-serif" font-size="{size}" font-weight="{weight}">{esc(s)}</text>'
def node(x,y,label,color='#d7f48c',r=32):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>'+txt(x,y+9,label,26,'#15200e',600)
def pill(x,y,label,fill='#2b3d23',color='#dce9cd',w=66):return f'<rect x="{x}" y="{y}" width="{w}" height="64" rx="10" fill="{fill}" stroke="#718659"/>'+txt(x+w/2,y+41,label,24,color,600)
def circle_illustration():
 majors=['C','G','D','A','E','B','F♯ / G♭','D♭','A♭','E♭','B♭','F']
 minors=['Am','Em','Bm','F♯m','C♯m','G♯m','D♯m / E♭m','B♭m','Fm','Cm','Gm','Dm']
 signatures=['0','1 ♯','2 ♯','3 ♯','4 ♯','5 ♯','6 ♯ / 6 ♭','5 ♭','4 ♭','3 ♭','2 ♭','1 ♭']
 s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" role="img"><title>Kvintsirkelen</title><desc>Dur ytterst, relativ moll innenfor. Stigende kvinter med klokken, fallende kvinter mot klokken.</desc><rect width="500" height="500" fill="#182216"/><circle cx="250" cy="250" r="190" fill="#1d2b17" stroke="#607b47"/><circle cx="250" cy="250" r="145" fill="none" stroke="#536a40"/><circle cx="250" cy="250" r="95" fill="#182216" stroke="#425831"/>'
 for i,(major,minor,sign) in enumerate(zip(majors,minors,signatures)):
  angle=math.radians(-90+i*30)
  def point(r):return (round(250+r*math.cos(angle),2),round(250+r*math.sin(angle),2))
  x,y=point(169);mx,my=point(120);sx,sy=point(217)
  s+=f'<g><title>{esc(major)}-dur, {esc(minor)}, {esc(sign)} faste fortegn</title><circle cx="{x}" cy="{y}" r="25" fill="{"#d7f48c" if i==0 else "#293b20"}"/>'+txt(x,y+8,major,18 if i==6 else 25,'#182216' if i==0 else '#e3efd7',600)+txt(mx,my+6,minor,12 if i==6 else 17,'#d5b979',500)+txt(sx,sy+5,sign,14,'#b7cba3',500)+'</g>'
 s+=txt(250,238,'KVINTSIRKELEN',13,'#d7f48c',600)+txt(250,260,'DUR · YTRE RING',9,'#c4d7af')+txt(250,278,'MOLL · INDRE RING',9,'#d5b979')
 s+=txt(250,485,'Med klokken: kvinter opp · Mot klokken: kvinter ned',11,'#a5bd8e')
 return s+'</svg>'
def illustration(kind):
 if kind=='circle':return circle_illustration()
 s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 430" role="img"><rect width="800" height="430" fill="#182216"/><defs><radialGradient id="glow"><stop stop-color="#9bb86b" stop-opacity=".14"/><stop offset="1" stop-color="#9bb86b" stop-opacity="0"/></radialGradient></defs><ellipse cx="560" cy="150" rx="440" ry="320" fill="url(#glow)"/>'
 for y in [80,160,240,320]:s+=f'<path d="M0 {y} Q200 {y-60} 400 {y} T800 {y}" fill="none" stroke="#536a42" stroke-opacity=".15"/>'
 if kind=='diatonic':
  s+=txt(400,66,'G-DUR · TREKLANGER',22,'#d7f48c')
  for i,(ch,roman,notes) in enumerate([('G','I','G B D'),('Am','ii','A C E'),('Bm','iii','B D F♯'),('C','IV','C E G'),('D','V','D F♯ A'),('Em','vi','E G B'),('F♯dim','vii°','F♯ A C')]):
   x=56+i*113;s+=f'<rect x="{x-40}" y="120" width="103" height="190" rx="10" fill="#23311c" stroke="#607b47"/>'+txt(x+12,170,ch,23,'#d7f48c')+txt(x+12,221,notes,15)+txt(x+12,274,roman,20,'#d5b979')
  s+=txt(400,373,'G A B C D E F♯',25)
 elif kind=='romans':
  s+=txt(400,64,'AKKORDENE I C-DUR',21,'#d7f48c',600)
  chords=[('I','C'),('ii','Dm'),('iii','Em'),('IV','F'),('V','G'),('vi','Am'),('vii°','Bdim')]
  for i,(roman,chord) in enumerate(chords):
   x=18+i*111
   s+=f'<rect x="{x}" y="120" width="101" height="203" rx="12" fill="#23311c" stroke="#607b47"/>'
   s+=txt(x+50,180,roman,33,'#d7f48c',600)
   s+=txt(x+50,231,chord,24,'#e3efd7',500)
   s+=txt(x+50,284,'DUR' if roman in ('I','IV','V') else 'DIM' if roman=='vii°' else 'MOLL',12,'#d5b979')
  s+=txt(400,388,'SAMME TRINN · NY TONEART · NYE AKKORDNAVN',15,'#b8cda5')
 elif kind=='targets':
  s+=txt(400,65,'ETT TONEUTVALG',19,'#d7f48c')+txt(400,111,'E F♯ G A B C D',25)
  for i,(ch,notes,target) in enumerate([('Em','E G B','G'),('C','C E G','E'),('G','G B D','B'),('D','D F♯ A','F♯')]):
   x=106+i*194;s+=f'<rect x="{x-70}" y="153" width="170" height="188" rx="12" fill="#23311c" stroke="#607b47"/>'+txt(x+15,201,ch,30)+txt(x+15,245,notes,21,'#d7f48c')+txt(x+15,302,target,27,'#d5b979')
  s+=txt(400,387,'MÅLTONER: TERSEN I HVER AKKORD',14,'#a9bd96')
 elif kind=='parallel':
  for y,label,notes in [(140,'E EOLISK',['E','F♯','G','A','B','C','D']),(292,'E DORISK',['E','F♯','G','A','B','C♯','D'])]:
   s+=txt(400,y-28,label,22,'#d7f48c')
   for i,n in enumerate(notes):s+=pill(132+i*78,y,n,'#d5b979' if i==5 else '#2b3d23','#182216' if i==5 else '#dce9cd')
 elif kind=='intervals':
  s+=txt(400,68,'AVSTAND BLIR TIL KLANG',14,'#a9bd96',500)+f'<path d="M205 228 Q400 50 595 228" stroke="#8fab6c" stroke-width="2" fill="none"/><line x1="200" y1="250" x2="600" y2="250" stroke="#576d45" stroke-width="2"/>'
  for i in range(8):s+=f'<circle cx="{200+i*400/7}" cy="250" r="4" fill="#76915a"/>'
  s+=node(200,250,'C',r=44)+node(600,250,'G','#d5b979',44)+txt(400,210,'7 halvtoner',23)+txt(400,355,'REN KVINT',18,'#d7f48c',600)
 elif kind=='triadfamily':
  s+=txt(400,58,'FIRE TREKLANGSTYPER',22,'#d7f48c',600)
  triads=[('DUR','C · E · G','1 · 3 · 5'),('MOLL','C · E♭ · G','1 · ♭3 · 5'),('FORMINSKET','C · E♭ · G♭','1 · ♭3 · ♭5'),('FORSTØRRET','C · E · G♯','1 · 3 · ♯5')]
  for i,(name,notes,formula) in enumerate(triads):
   x=28+i*196
   s+=f'<rect x="{x}" y="119" width="181" height="205" rx="12" fill="#23311c" stroke="#627e4b"/>'
   s+=txt(x+90,156,name,15,'#d7f48c',600)
   s+=txt(x+90,220,notes,24,'#e3efd7')
   s+=txt(x+90,281,formula,19,'#d5b979')
  s+=txt(400,390,'SAMME GRUNNTONE · ULIKE TERSER OG KVINTER',16,'#b8cda5')
 elif kind=='triads':
  s+=txt(225,83,'DUR',18,'#d7f48c',600)+txt(575,83,'MOLL',18,'#d5b979',600)
  for x in [80,430]:s+=f'<rect x="{x}" y="118" width="290" height="220" rx="16" fill="#20301b" stroke="#526b3e"/>'
  for x,n in zip([140,225,310],['C','E','G']):s+=node(x,217,n,r=28)
  for x,n in zip([490,575,660],['C','E♭','G']):s+=node(x,217,n,'#d5b979' if n=='E♭' else '#d7f48c',28)
  s+=txt(225,297,'1 · 3 · 5',22)+txt(575,297,'1 · ♭3 · 5',22)+txt(400,385,'ÉN TONE · EN NY FARGE',16,'#a9bd96')
 elif kind=='melody':
  s+=txt(400,74,'GI EN LITEN IDÉ ROM',16,'#a9bd96')
  for y in range(150,291,35):s+=f'<line x1="85" y1="{y}" x2="715" y2="{y}" stroke="#566f43" stroke-width="1"/>'
  s+='<path d="M130 270 C220 270 210 210 295 210 S385 140 465 140 S540 210 615 210" fill="none" stroke="#c4dd9a" stroke-width="2"/>'
  for x,y,n in [(130,270,'E'),(295,210,'G'),(465,140,'B'),(615,210,'G')]:s+=node(x,y,n,r=25)
  s+=txt(400,373,'SPILL · VENT · LYTT · SVAR',18,'#d7f48c',600)
 elif kind=='sevenmodes':
  s+=txt(400,52,'ETT TONEUTVALG · SJU SENTRE',20,'#d7f48c',600)+txt(400,81,'C · D · E · F · G · A · B',20,'#c7d7b5')
  modes=[('IONISK','C','1 2 3 4 5 6 7','DUR'),('DORISK','D','1 2 ♭3 4 5 6 ♭7','6'),('FRYGISK','E','1 ♭2 ♭3 4 5 ♭6 ♭7','♭2'),('LYDISK','F','1 2 3 ♯4 5 6 7','♯4'),('MIKSOLYDISK','G','1 2 3 4 5 6 ♭7','♭7'),('EOLISK','A','1 2 ♭3 4 5 ♭6 ♭7','MOLL'),('LOKRISK','B','1 ♭2 ♭3 4 ♭5 ♭6 ♭7','♭5')]
  for i,(mode,root,formula,colour) in enumerate(modes):
   x=23+i*110
   s+=f'<rect x="{x}" y="118" width="103" height="220" rx="11" fill="#23311c" stroke="#536e43"/>'
   s+=txt(x+51,155,mode,11,'#c9d9b5',600)
   s+=txt(x+51,219,root,39,'#d7f48c',600)
   s+=txt(x+51,260,colour,15,'#d5b979',600)
   s+=txt(x+51,309,formula,7,'#dde7d1')
  s+=txt(400,386,'TONALT SENTRUM + INTERVALLER = NY MODAL KARAKTER',15,'#b8cda5')
 elif kind=='modes':
  s+=txt(400,91,'E DORISK',30,'#e2f0d1',500)
  for i,n in enumerate(['E','F♯','G','A','B','C♯','D']):s+=pill(132+i*78,170,n,'#d5b979' if i==5 else '#d7f48c' if i==0 else '#2b3d23','#182216' if i in [0,5] else '#dce9cd')
  s+=txt(400,299,'1  –  2  –  ♭3  –  4  –  5  –  6  –  ♭7',24)+txt(400,369,'STOR SEKST · MOLL MED LYS',15,'#d5b979')
 elif kind=='cadence':
  for i,(ch,r) in enumerate([('Dm7','ii7'),('G7','V7'),('Cmaj7','Imaj7')]):
   x=105+i*205;s+=f'<rect x="{x}" y="132" width="175" height="173" rx="15" fill="{"#304126" if i==2 else "#22311b"}" stroke="{"#d7f48c" if i==2 else "#6e8456"}" stroke-width="2"/>'+txt(x+87,211,ch,31)+txt(x+87,265,r,26,'#d7f48c')
   if i<2:s+=txt(x+190,225,'→',26,'#a4ba87')
  s+=txt(400,74,'BEVEGELSE OG HJEMKOMST',16,'#a9bd96')+txt(400,376,'C-DUR · ii–V–I',20,'#d7f48c')
 elif kind=='sevenths':
  s+=txt(210,213,'maj7',66,'#d7f48c',500)+txt(210,261,'EN NY FARGE',15,'#a9bd96')
  for i,(n,f) in enumerate([('C','1'),('E','3'),('G','5'),('B','7')]):
   x=405+i*80;y=300-i*60;s+=f'<line x1="390" y1="{y}" x2="725" y2="{y}" stroke="#506a3d"/>'+node(x,y,n,'#d5b979' if i==3 else '#d7f48c',25)+txt(x+39,y+6,f,17,'#a9bd96')
 elif kind=='harmonic':
  s+=txt(400,61,'ETT TONEMATERIALE · TO SENTRE',15,'#a9bd96')+txt(400,119,'A HARMONISK MOLL',20)
  for i,n in enumerate(['A','B','C','D','E','F','G♯']):s+=pill(132+i*78,144,n,'#d5b979' if n=='G♯' else '#2b3d23','#17220f' if n=='G♯' else '#e2f0d1')
  s+=txt(400,263,'E FRYGISK DOMINANT',20)
  for i,n in enumerate(['E','F','G♯','A','B','C','D']):s+=pill(132+i*78,289,n,'#d7f48c' if i==0 else '#d5b979' if n=='G♯' else '#2b3d23','#17220f' if i==0 or n=='G♯' else '#e2f0d1')
 elif kind=='voices':
  s+=txt(190,67,'Cmaj7',26)+txt(610,67,'Am7/C',26)
  for i,(a,b) in enumerate([('B','A'),('G','G'),('E','E'),('C','C')]):
   y=126+i*65;end=y+26 if i==0 else y;s+=f'<path d="M235 {y} C380 {y} 420 {end} 565 {end}" fill="none" stroke="{"#d5b979" if i==0 else "#839e63"}" stroke-width="3"/>'+node(190,y,a,'#d5b979' if i==0 else '#d7f48c',23)+node(610,end,b,'#d5b979' if i==0 else '#d7f48c',23)
  s+=txt(400,399,'TRE TONER BLIR · ÉN FLYTTER SEG',15,'#a9bd96')
 elif kind=='rhythm':
  s+=txt(400,88,'7/8',45,'#e2f0d1',500)
  for x,w,color in [(95,164,'#d7f48c'),(277,164,'#d5b979'),(459,246,'#a7c7b9')]:s+=f'<rect x="{x}" y="156" width="{w}" height="142" rx="14" fill="#24351c" stroke="{color}"/>'
  for i,(x,n,color) in enumerate([(136,'1','#d7f48c'),(218,'2','#d7f48c'),(318,'1','#d5b979'),(400,'2','#d5b979'),(500,'1','#a7c7b9'),(582,'2','#a7c7b9'),(664,'3','#a7c7b9')]):s+=node(x,226,n,color,24)
  s+=txt(400,365,'2  +  2  +  3',28,'#d7f48c')
 return s+'</svg>'
def header(prefix='',active=False):
 return render_header(prefix, 'articles')
def footer(prefix=''):
 return f'<footer><a class="brand footer-brand" href="{prefix or "./"}">MODUS<span class="branddot">.</span></a><span>Natur som inspirasjon. Musikk som uttrykk.</span><a href="{prefix}artikler.html">Artikkelbiblioteket ↗</a><a href="{prefix}modus-plus.html">Modus+ · konsept</a></footer>'
def minutes(a):return max(2,math.ceil(len(re.sub('<[^>]+>',' ',a['intro']+' '.join(s[1] for s in a['sections'])).split())/180))
def quiz(a):
 questions=[]
 for i,q in enumerate(QUIZZES[a['slug']]):
  choices=''.join(f'<label><input type="radio" name="q{i}" value="{j}" required><span>{esc(option)}</span></label>' for j,option in enumerate(q['options']))
  questions.append(f'<fieldset data-answer="{q["answer"]}"><legend>{i+1}. {esc(q["question"])}</legend><div class="quiz-options">{choices}</div><div class="quiz-feedback" hidden><strong class="quiz-verdict"></strong><p>{esc(q["explanation"])}</p><a href="#del-{q["section"]}">Les forklaringen i artikkelen ↗</a></div></fieldset>')
 return f'''<section id="quiz" class="article-quiz" data-quiz-id="{a['slug']}" aria-labelledby="quizTitle"><p class="eyebrow">SJEKK FORSTÅELSEN</p><h2 id="quizTitle">Hva sitter igjen?</h2><p>Tre spørsmål om det du har lest. Alle tre riktige gir fullført quiz. Du kan prøve så mange ganger du vil.</p><p class="quiz-storage">Fullføring lagres i denne nettleseren og deles mellom norsk og engelsk.</p><div class="quiz-complete" hidden><strong>✓ Quiz fullført</strong><p>Du har svart riktig på alle tre spørsmålene. Ta ideen med til instrumentet.</p><button type="button" class="quiz-retake">Repeter quizen</button><a href="../artikler.html">Til artikkelbiblioteket ↗</a></div><form class="quiz-form">{''.join(questions)}<button class="button" type="submit">Sjekk svarene</button><button class="quiz-retry" type="button" hidden>Prøv igjen</button></form><p class="quiz-result" role="status" aria-live="polite" tabindex="-1"></p><noscript>Slå på JavaScript for å ta quizen og lagre fullføring.</noscript></section>'''
def card(a,prefix=''):
 label=LEVELS[a['level']][0]
 return f'<article class="article-card {"circle-article" if a["art"]=="circle" else ""}" data-article-id="{a["slug"]}" data-level="{a["level"]}" data-topic="{a["category"]}" data-search="{esc(a["title"]+" "+a["topic"]+" "+a["intro"])}"><a class="card-main" href="{prefix}artikler/{a["slug"]}.html"><div class="card-art"><img src="{prefix}images/articles/{a["slug"]}.svg?v=content2" width="{500 if a["art"]=="circle" else 800}" height="{500 if a["art"]=="circle" else 430}" alt="{esc(ALT[a["art"]])}" loading="lazy"><span class="level-badge {a["level"]}">{label}</span></div><div class="card-copy"><div class="card-meta"><span>{esc(a["topic"])}</span><span>{minutes(a)} min lesing</span></div><h2>{esc(a["title"])}</h2><p>{esc(a["intro"])}</p><span class="read-more">Les artikkelen <span aria-hidden="true">↗</span></span></div></a><div class="card-quiz"><span class="card-quiz-status">3 spørsmål</span><a href="{prefix}artikler/{a["slug"]}.html#quiz" class="card-quiz-link">Ta quizen ↗</a></div></article>'
def learning_intro(a):
 if not a.get('learning'):return ''
 data=a['learning'];goals=''.join(f'<li>{esc(goal)}</li>' for goal in data['goals'])
 links=''.join(f'<a href="{esc(link["slug"])}.html">{esc(link["label"])} ↗</a>' for link in data['links'])
 return f'<section class="article-learning" aria-labelledby="learningTitle"><p class="eyebrow">DETTE LÆRER DU</p><h2 id="learningTitle">{esc(a["title"])}</h2><ul>{goals}</ul><div class="article-prerequisites"><h3>Før du begynner</h3><p>{esc(data["prerequisites"])}</p><div>{links}</div></div></section>'
def practice_steps(a):
 return '<ol class="practice-steps">'+''.join(f'<li>{esc(step)}</li>' for step in a['practice_steps'])+'</ol>' if a.get('practice_steps') else ''
def next_step(a):
 if not a.get('next_step'):return ''
 data=a['next_step'];target=next(item for item in ARTICLES if item['slug']==data['slug'])
 return f'<section class="article-next" aria-labelledby="nextStepTitle"><p class="eyebrow">ANBEFALT NESTE STEG</p><h2 id="nextStepTitle">{esc(target["title"])}</h2><p>{esc(data["reason"])}</p><a class="button" href="{esc(target["slug"])}.html">{esc(target["title"])} ↗</a></section>'
for a in ARTICLES:
 (DIST/'images/articles'/f'{a["slug"]}.svg').write_text(illustration(a['art']))
 label=LEVELS[a['level']][0];toc=''.join(f'<a href="#del-{i}">{esc(sec[0])}</a>' for i,sec in enumerate(a['sections'],1))+'<a href="#quiz">Ta quizen ↗</a>'
 body=''.join(f'<section id="del-{i}"><h2>{esc(sec[0])}</h2>{sec[1]}</section>' for i,sec in enumerate(a['sections'],1))
 related=sorted([b for b in ARTICLES if b['slug']!=a['slug']], key=lambda b:(b['category']!=a['category'],b['level']!=a['level'],ORDER.index(b['slug'])))[:2]
 related_html=''.join(f'<a href="{b["slug"]}.html"><span>{esc(b["topic"])}</span><strong>{esc(b["title"])}</strong><b aria-hidden="true">↗</b></a>' for b in related)
 page=f'''<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111310"><title>{esc(a['title'])} · MODUS</title><meta name="description" content="{esc(a['intro'])}"><link rel="stylesheet" href="../home.css"><link rel="stylesheet" href="../articles.css?v=content2"></head><body>{header('../')}<main class="reading-page"><nav class="breadcrumbs" aria-label="Brødsmuler"><a href="../">Forsiden</a><span>/</span><a href="../artikler.html">Artikler</a><span>/</span><span>{label}</span></nav><article><header class="reading-header"><div class="reading-meta"><span class="level-badge {a['level']}">{label}</span><span>{esc(a['topic'])}</span><span>{minutes(a)} min lesing</span></div><h1>{esc(a['title'])}</h1><p class="reading-intro">{esc(a['intro'])}</p></header>{learning_intro(a)}<figure class="reading-illustration"><img src="../images/articles/{a['slug']}.svg?v=content2" width="{500 if a['art']=='circle' else 800}" height="{500 if a['art']=='circle' else 430}" alt="{esc(ALT[a['art']])}"></figure><div class="reading-layout"><aside class="contents"><span>I DENNE ARTIKKELEN</span>{toc}</aside><div class="reading-body">{body}<section class="article-practice"><p class="eyebrow">FRA LESING TIL SPILLING</p><h2>Prøv det selv.</h2><p>{esc(a['exercise'])}</p>{practice_steps(a)}<a class="button" href="../{a['practice']}">{esc(a['practice_label'])} <span aria-hidden="true">↗</span></a></section>{quiz(a)}{next_step(a)}</div></div></article><section class="related"><p class="eyebrow">LES VIDERE</p><div>{related_html}</div><a class="all-articles" href="../artikler.html">← Til alle artiklene</a></section></main>{footer('../')}<script src="../article-quiz.js?v=content2" defer></script></body></html>'''
 page=page.replace('</head><body>', '<link rel="stylesheet" href="../learning-premises.css?v=20261029-confirm"><script src="../learning-premises.js?v=20261029-confirm" defer></script></head><body>')
 (DIST/'artikler'/f'{a["slug"]}.html').write_text(with_navigation_css(page, '../'))
journey,library=render_library(ARTICLES, LEVELS, card)
listing=f'''<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111310"><title>MODUS · Artikler om musikkteori</title><meta name="description" content="Illustrerte artikler om musikkteori, fra nybegynner til fordypning. Les om intervaller, akkorder, improvisasjon, moduser, harmonikk og rytme."><link rel="stylesheet" href="home.css"><link rel="stylesheet" href="articles.css?v=content2"></head><body>{header()}<main class="articles-page"><section class="articles-hero"><div><p class="eyebrow">ARTIKKELBIBLIOTEKET</p><h1>Små innsikter.<br><em>Større spillerom.</em></h1><p>Musikkteori du kan ta med til instrumentet.<br>Finn et tema som vekker nysgjerrigheten – og les i ditt eget tempo.</p></div><div class="articles-landscape" aria-hidden="true"></div></section>{journey}<section class="learning-callout"><div><span>LÆRINGSSTI · SEKS STEG</span><strong>Forstå og bruk dorisk</strong></div><a href="laer-dorisk.html">Start med å lytte ↗</a></section>{library}<section class="plus-teaser"><div><span>MODUS+ · KONSEPT</span><h2>Et mulig neste kapittel.</h2><p>Se hvordan et fremtidig medlemskap kan gi mer rom for fordypning. Alle dagens artikler er fortsatt åpne.</p></div><a href="modus-plus.html">Forhåndsvis Modus+ ↗</a></section><section class="library-bottom"><div><p class="eyebrow">LÆR MED ØRET</p><h2>Les litt. Lytt litt. <em>Spill selv.</em></h2><p>Ta ideen videre med pianokart, lydeksempler og praktiske akkordgrep.</p></div><a class="button" href="teori.html">Åpne teorirommet <span aria-hidden="true">↗</span></a></section></main>{footer()}<script src="articles.js?v=content2" defer></script><script src="article-quiz.js?v=content2" defer></script></body></html>'''
listing=listing.replace('</head><body>', '<link rel="stylesheet" href="learning-premises.css?v=20261029-confirm"><script src="learning-premises.js?v=20261029-confirm" defer></script></head><body>')
(DIST/'artikler.html').write_text(with_navigation_css(listing))
print(f'Generated {len(ARTICLES)} complete articles, {len(ARTICLES)} illustrations and article index')

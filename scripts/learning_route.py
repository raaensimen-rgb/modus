"""#53 guided public route over UX-001's existing ORDER; no new course/progress model."""
from pathlib import Path
import json,re,html,hashlib,shutil
from article_library import ORDER
R=Path(__file__).resolve().parents[1]
def E(s):return html.escape(str(s),quote=True)
def apply(target):
 target=Path(target);source={a['slug']:a for a in json.loads((R/'content/articles.json').read_text())}
 for pre,en in [('',False),('en/',True)]:
  root=target/pre;t=lambda nb,eng:eng if en else nb
  catalog=(root/'artikler.html').read_text();allowed=set(re.findall(r'data-article-id="([^"]+)"',catalog));ids=[s for s in ORDER if s in allowed];assert len(ids)==(16 if en else 52)
  def title(slug):return html.unescape(re.sub('<[^>]+>','',re.search(r'<h1[^>]*>(.*?)</h1>',(root/'artikler'/f'{slug}.html').read_text(),re.S)[1]))
  def practice(slug,prefix=''):
   cat=source[slug]['category'];topic='chords' if cat=='chords' else 'cadences' if cat=='harmony' else 'intervals' if cat=='basics' else 'modes'
   # Public query API selects the real tab; do not rely on the known legacy hash issue.
   return prefix+'teori.html?topic='+topic+'&key=0&fromArticle='+slug+('&interval=4' if topic=='intervals' else '&quality=0' if topic=='chords' else '')
  rows=[{'id':s,'title':title(s),'href':'artikler/'+s+'.html','practice':practice(s),'level':source[s]['level']} for s in ids]
  reasons={
   'toner-og-intervaller':t('Start med tonenavn, avstand og lytting.','Begin with note names, distance and listening.'),
   'dur-og-moll':t('Bruk intervallene til å høre tersen i en akkord.','Use intervals to hear the third in a chord.'),
   'bygg-akkorder-i-en-toneart':t('Bygg videre fra treklanger til akkorder i én toneart.','Move from triads to chords within one key.'),
   'kvintsirkelen':t('Se hvordan tonearter og akkordrøtter henger sammen.','Connect keys and chord roots.'),
   'romertall-i-musikk':t('Beskriv akkordenes plassering før du transponerer.','Describe chord positions before transposing.'),
   'treklanger-fra-grunnform-til-omvending':t('Undersøk akkordtoner og bass før mer kompleks harmonikk.','Explore chord tones and bass before more complex harmony.'),
   'din-forste-improvisasjon':t('Bruk få kjente toner til en egen frase.','Use a few familiar notes in your own phrase.')}
  meaning=t('Åpnet er ikke det samme som lest. Quiz viser bare faktisk quizresultat, ikke automatisk mestring. Neste steg er alltid tilgjengelig; egen forståelse vurderer du selv.','Opened does not mean read. Quiz status records the actual quiz result, not automatic mastery. The next step is always available; understanding is your own assessment.')
  data='<template id="learning-route-data">'+E(json.dumps(rows,ensure_ascii=False))+'</template>'
  def resume():return '<div class="route-resume" data-route-resume><p role="status" data-route-status>'+t('Begynn med Toner og intervaller.','Begin with Notes and intervals.')+'</p><a class="button" data-route-continue href="artikler/toner-og-intervaller.html">'+t('Begynn fra starten','Start from the beginning')+'</a></div>'
  def section(full):
   intro=t('En veiledet leserekkefølge gjennom publiserte artikler. Les, lytt og prøv ved instrumentet.','A guided reading order through published articles. Read, listen and try at your instrument.')
   out='<section class="learning-route'+('' if full else ' route-entry')+'" data-learning-route><header class="route-heading"><h2>'+t('Start med grunnlaget','Start with the foundations')+'</h2><p>'+intro+'</p></header>'+resume()
   if full:
    out+='<ol class="route-steps">'
    for i,row in enumerate(rows):
     slug=row['id'];reason=reasons.get(slug,t('Bygg videre på temaene over. Bruk øvelsen og lag en egen variant.','Build on the preceding topics. Try the exercise and make your own variation.'))
     out+=f'<li class="route-step" id="route-{slug}" data-route-step="{slug}"><span class="route-number">{i+1:02}</span><div><h3><a href="{row["href"]}">{E(row["title"])}</a></h3><p class="route-reason">{E(reason)}</p><p data-route-step-status>'+t('Quiz ikke fullført','Quiz not completed')+'</p><div class="route-actions"><a href="'+row['href']+'">'+t('Les artikkelen','Read the article')+'</a><a href="'+E(row['href']+'#route-practice')+'">'+t('Instrumentoppgaven','Instrument practice')+'</a><a href="'+row['href']+'#quiz">'+t('Valgfri quiz','Optional quiz')+'</a></div></div></li>'
    out+='</ol>'
   else:out+='<p><a href="grunnstudier.html">'+t('Se hele den veiledede studieruten','View the guided study route')+' →</a></p>'
   out+='<p class="route-meaning">'+meaning+'</p>'
   if en:out+='<p>16 complete English articles are included here. The Norwegian library has 52 articles. <a href="../studierute.html?lang=nb">See the extended Norwegian T1–T10 map</a>.</p>'
   return out+'</section>'
  entry_shell=(root/'laeringssti.html').read_text()
  for n in ['laeringssti.html','grunnstudier.html','studierute.html']:
   path=root/n
   if not path.exists():
    assert n=='studierute.html'
    old=R/'release-inputs/ux001-production-1721e30'/pre/n
    path.write_text(old.read_text() if old.exists() else re.sub(r'<main\b[\s\S]*?</main>','<main id="main-content" class="path-shell"><h1>Study route</h1></main>',entry_shell,count=1))
   s=path.read_text();full=n=='grunnstudier.html'
   if full:
    s=re.sub(r'<main\b[\s\S]*?</main>','<main id="main-content" class="path-shell" tabindex="-1"><h1>'+t('MODUS Grunnstudier','MODUS Foundation studies')+'</h1>'+section(True)+'</main>',s,count=1)
    s=re.sub(r'<title>.*?</title>','<title>MODUS · '+t('Grunnstudier','Foundation studies')+'</title>',s,count=1)
   else:
    if n=='laeringssti.html':
     hero=re.search(r'<section\b[^>]*class="path-hero[^"]*"[\s\S]*?</section>',s);assert hero
     s=s[:hero.end()]+section(False)+s[hero.end():]
    else:s=s.replace('<div class="reading-body">',section(False)+'<div class="reading-body">',1) if not en else s.replace('</main>',section(False)+'</main>',1)
   s=s.replace('</main>',data+'</main>',1);path.write_text(s)
  # The two start entry points now share the existing /laeringssti address.
  p=root/'index.html';s=p.read_text();s=re.sub(r'(<a\b[^>]*href=")artikler/toner-og-intervaller.html("[^>]*data-start-learning)',r'\1laeringssti.html\2',s,count=1);p.write_text(s)
  for slug in ids:
   p=root/'artikler'/f'{slug}.html';s=p.read_text()
   # Keep reviewed UX-001 navigation and all original article prose/quiz.
   s=s.replace('<div class="start-reading-tools">','<div class="start-reading-tools"><a href="../grunnstudier.html#route-'+slug+'">'+t('Tilbake til studieruten','Back to the study route')+'</a>',1)
   s=re.sub(r'(<a class="start-practice" href=")[^"]+',lambda m:m[1]+E(practice(slug,'../')),s,count=1)
   s=s.replace('<section class="article-practice">','<section class="article-practice" id="route-practice">',1)
   # Keep the real exercise destination; repair legacy theory hashes with its existing query API.
   from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
   task=re.search(r'(<section class="article-practice"[^>]*>[\s\S]*?<a class="button" href=")([^"<>]+)',s)
   if task:
    u=urlsplit(html.unescape(task[2]));params=dict(parse_qsl(u.query))
    if u.path in ('../teori.html','../backingtracks.html','../akkorder.html','../skalabibliotek.html'):
     topics={'intervaller':'intervals','akkorder':'chords','moduser':'modes','kadenser':'cadences'}
     if u.path=='../teori.html' and u.fragment in topics:params['topic']=topics[u.fragment]
     params['fromArticle']=slug
     href=urlunsplit((u.scheme,u.netloc,u.path,urlencode(params),u.fragment))
     s=s[:task.start(2)]+E(href)+s[task.end(2):]

   s=re.sub(r'(<a class="start-practice"[^>]*><span>)[\s\S]*?</a>',lambda m:m[1]+t('Valgfritt verktøy</span><strong>Utforsk i teorirommet</strong></a>','Optional tool</span><strong>Explore in the theory room</strong></a>'),s,count=1)
   # Explicit context is required by the preserved no-referrer policy, including menu and Jam links.
   def tool_context(m):
    raw=m[1];u=urlsplit(html.unescape(raw))
    if u.path not in ('../teori.html','../backingtracks.html','../akkorder.html','../skalabibliotek.html'):return m[0]
    params=dict(parse_qsl(u.query))
    if 'fromArticle' in params:
     assert params['fromArticle']==slug;return m[0]
    parts=raw.split('#',1);parts[0]+=('&amp;' if '?' in parts[0] else '?')+'fromArticle='+slug
    return 'href="'+'#'.join(parts)+'"'
   s=re.sub(r'href="([^"]+)"',tool_context,s)
   p.write_text(s)
  for n in ['teori.html' ,'backingtracks.html','akkorder.html','skalabibliotek.html']:
   p=root/n;s=p.read_text();nav='<nav class="route-return" data-route-return hidden aria-label="'+t('Tilbake til artikkelen','Return to article')+'"><a data-route-return-link href="grunnstudier.html">'+t('Tilbake til artikkelen','Back to the article')+'</a> · <a href="grunnstudier.html">'+t('Studierute','Study route')+'</a></nav>'
   s=s.replace('</main>',nav+data+'</main>',1);p.write_text(s)
  # Preserve article context when the scale controls canonicalize their query string.
  scale=root/'scale-library.js';js=scale.read_text();old="const query=new URLSearchParams(state);if(document.body.classList.contains('scale-practicing'))";new="const query=new URLSearchParams(state);const fromArticle=params.get('fromArticle');if(/^[a-z0-9-]+$/.test(fromArticle||''))query.set('fromArticle',fromArticle);if(document.body.classList.contains('scale-practicing'))"
  assert js.count(old)==1,'Unexpected scale query implementation';scale.write_text(js.replace(old,new))
  # Route context for the retained approved local Jam exercise, without changing its music.
  # Jam musical configuration/prose remains unchanged; its link now explicitly carries context.
  route_paths=['laeringssti.html','grunnstudier.html','studierute.html','teori.html','backingtracks.html','akkorder.html','skalabibliotek.html']
  for ext in ['css','js']:
   src=R/('learning-route.'+ext);name='learning-route.'+hashlib.sha256(src.read_bytes()).hexdigest()[:10]+'.'+ext;(root/name).write_bytes(src.read_bytes())
   for n in route_paths:
    p=root/n;s=p.read_text();tag='<link rel="stylesheet" href="'+name+'">' if ext=='css' else '<script src="'+name+'" defer></script>';p.write_text(s.replace('</head>',tag+'</head>',1))
 print('Guided route: shared public ORDER, 52 NB/16 EN, existing quiz/evidence keys read only; private texts untouched.')

def reverse_for_legacy_checks(candidate,out):
 """Verify the complete #53 delta before reusing untouched upstream negative tests."""
 import tempfile,subprocess
 baseline=R/'release-inputs/learning-route-24670c5'
 inventory=lambda root:{p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and p.name!='release-manifest.json'}
 pinned=json.loads((R/'release-inputs/learning-route-base-files.json').read_text());assert inventory(baseline)=={k:v for k,v in pinned.items() if k!='release-manifest.json'}
 with tempfile.TemporaryDirectory() as tmp:
  expected=Path(tmp)/'expected';shutil.copytree(baseline,expected);apply(expected)
  from image_optimization import apply as apply_images
  apply_images(expected)
  from scale_p1 import apply as apply_p1
  apply_p1(expected)
  from learning_entry import apply as apply_entry
  apply_entry(expected)
  from learning_menu_copy import apply as apply_menu_copy
  apply_menu_copy(expected)
  assert inventory(candidate)==inventory(expected),'Unexpected route, content, media or private-file delta'
 shutil.copytree(baseline,out)
 manifest=json.loads((out/'release-manifest.json').read_text());manifest['source_sha']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip();(out/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

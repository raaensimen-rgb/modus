"""Integrate the exact film approved by the owner; never release the retired film."""
from pathlib import Path
import hashlib,json,re,shutil,sys
R=Path(__file__).resolve().parents[1];A=R/'approved-intro-film'
FILM_SHA='81eed15e5f0fa3c43ef0ba3130162bed23564621d68a9c96cf8f2fefcf4359b4'
def apply(target):
 target=Path(target).resolve();assert target!=R
 film=A/'MODUS_2_introduksjonsfilm_NO.mp4';assert hashlib.sha256(film.read_bytes()).hexdigest()==FILM_SHA,'Unapproved film version'
 media=target/'media';media.mkdir(exist_ok=True)
 shutil.copy2(film,media/'modus-intro-81eed15e5f0f.mp4');shutil.copy2(A/'MODUS_2_intro_poster.jpg',media/'modus-intro-poster.jpg')
 for prefix in ['', 'en/']:
  page=target/prefix/'index.html';s=page.read_text();en=bool(prefix)
  # Retain the retired film's route and all unrelated network policy.
  s=re.sub(r'<button\b[^>]*data-intro-film-open[\s\S]*?</button>','',s)
  s=re.sub(r'<p class="introduction-unavailable"[^>]*>[\s\S]*?</p>','',s)
  button='<button type="button" class="intro-film-button" data-intro-film-open aria-haspopup="dialog"><span data-intro-film-label>'+('Watch the film ▷' if en else 'Se filmen ▷')+'</span></button>'
  s=re.sub(r'<button type="button" disabled aria-describedby="film-unavailable">[\s\S]*?</button>',button,s)
  # Idempotent rebuild: the canonical source is still the maintained homepage.
  if 'data-intro-film-open' not in s:
   s=s.replace('</div></section>\n<details class="home-legacy-details">',button+'</div></section>\n<details class="home-legacy-details">',1)
  assert s.count('data-intro-film-open')==1,'Expected exactly one film-field trigger'
  s=s.replace('src="images/modus-design-landscape.png" width="1536" height="1024" alt="" loading="lazy"><img class="introduction-mark"','src="/media/modus-intro-poster.jpg" width="1920" height="1080" alt="" loading="lazy"><img class="introduction-mark"')
  s=s.replace('A short introduction to the idea, the content and the learning journey.','82 seconds with Norwegian text and original music. An English text alternative is available in the player.').replace('En kort introduksjon til ideen, innholdet og læringsreisen.','82 sekunder om ideen, innholdet og læringsreisen – med norsk tekst og original musikk.')
  s=s.replace('src="/media/modus-intro-poster.jpg"', 'src="'+('../' if en else '')+'media/modus-intro-poster.jpg"')
  # The released poster contains the logo already; remove the old second logo/label.
  s=re.sub(r'<img class="introduction-mark"[^>]*><span class="introduction-label">[\s\S]*?</span>','',s)
  if 'intro-film.css' not in s:s=s.replace('</head>','<link rel="stylesheet" href="intro-film.css"><script defer src="intro-film.js"></script></head>',1)
  page.write_text(s)
  (target/prefix/'intro-film.js').write_bytes((A/'player.js').read_bytes())
  css=(R/'intro-film.css').read_text()+'\n'+(A/'player.css').read_text();(target/prefix/'intro-film.css').write_text(css)
 print('Approved film integrated:',FILM_SHA)
if __name__=='__main__':apply(Path(sys.argv[1]) if len(sys.argv)>1 else R/'dist')

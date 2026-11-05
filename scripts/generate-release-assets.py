"""Original deterministic replacements; no third-party recording or image input."""
from pathlib import Path
import math,random,wave,struct,json,hashlib
R=Path(__file__).resolve().parents[1];O=R/'release-inputs';D=O/'audio';D.mkdir(exist_ok=True)
rate=44100;manifest=[]
for kind,duration,seed in [('kick',.45,11),('snare',.28,29),('hihat',.12,47)]:
 rng=random.Random(seed);pcm=[];phase=0;last=0
 for i in range(int(rate*duration)):
  t=i/rate;noise=rng.uniform(-1,1);hp=(noise-last)*.5;last=noise;attack=min(1,t/.002)
  if kind=='kick':
   phase+=2*math.pi*(48+100*math.exp(-t*38))/rate;v=.75*math.sin(phase)*math.exp(-t*11)+.06*hp*math.exp(-t*100)
  elif kind=='snare':v=.48*hp*math.exp(-t*18)+.25*math.sin(2*math.pi*185*t)*math.exp(-t*25)
  else:v=.36*hp*math.exp(-t*48)
  pcm.append(int(max(-.95,min(.95,v*attack))*32767))
 p=D/(kind+'.wav')
 with wave.open(str(p),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(struct.pack('<'+'h'*len(pcm),*pcm))
 manifest.append({'path':'audio/'+p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'origin':'Original deterministic oscillator and seeded noise synthesis; no recording input','duration_seconds':duration,'peak':max(abs(x) for x in pcm)/32767})
mountain='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024"><title>MODUS mountain lake — original vector landscape</title><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#234b42"/><stop offset="1" stop-color="#071b18"/></linearGradient><linearGradient id="w" x2="0" y2="1"><stop stop-color="#467966"/><stop offset="1" stop-color="#081f1c"/></linearGradient></defs><path fill="url(#s)" d="M0 0h1536v1024H0z"/><circle cx="1135" cy="210" r="92" fill="#b8d3a5" opacity=".26"/><path fill="#315e51" d="M0 540 180 325 350 450 590 140 825 440 1100 220 1536 570v454H0z"/><path fill="#688f7b" d="m350 450 240-310 235 300-150-102-85 12-98-4z"/><path fill="#c2d1b9" d="m480 282 110-142 106 136-70-42-34 20-40-20z"/><path fill="#153e32" d="m0 650 260-265 200 212 420-230 320 265 336-212v604H0z"/><path fill="url(#w)" d="M0 665q768-65 1536 0v359H0z"/><path fill="#6c9d82" opacity=".18" d="m300 680 290 230 270-240-220 80-50 85-100-90z"/><g stroke="#a8c8a3" opacity=".18"><path d="M620 760h300M340 840h650M720 920h500M120 710h280M1100 780h300"/></g><path fill="#09291f" d="m0 670 50-130 25 75 60-180 50 190 65-130 60 150v349H0zM1536 630l-80-190-60 220-60-130-30 160v334h230z"/></svg>'''
globe='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><title>Original geometric MODUS atlas</title><defs><radialGradient id="g"><stop stop-color="#4b8171"/><stop offset="1" stop-color="#092b26"/></radialGradient></defs><path fill="#10231d" d="M0 0h1200v800H0z"/><circle cx="780" cy="400" r="330" fill="url(#g)" stroke="#8cb79a" stroke-width="2"/><g fill="none" stroke="#81b99d" opacity=".4">'''+''.join('<ellipse cx="780" cy="400" rx="'+str(r)+'" ry="330"/>' for r in [80,180,270])+''.join('<ellipse cx="780" cy="'+str(y)+'" rx="'+str(rx)+'" ry="35"/>' for y,rx in [(180,240),(290,310),(400,330),(510,310),(620,240)])+'''</g><g fill="#abc78b" opacity=".65"><path d="m540 230 115-90 100 70-45 85 75 60-60 90-75-65-60-10-80-95zM790 450l115-50 65 90-30 100-100 75-50-100zM930 240l95-30 55 90-75 40z"/></g></svg>'''
for name,data in [('mountain-original.svg',mountain),('atlas-original.svg',globe)]:
 p=O/name;p.write_text(data);manifest.append({'path':'images/'+name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'origin':'Original SVG paths, gradients and geometric primitives authored for this release; no bitmap input'})
(O/'original-assets.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Original assets generated',len(manifest))

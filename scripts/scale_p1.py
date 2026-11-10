"""SK-QA-001/006: bounded scale keyboard/theme delta and reviewed SK-QA-002 follow-up over unchanged A06."""
from pathlib import Path
import hashlib,shutil
R=Path(__file__).resolve().parents[1]
BASE=R/'release-inputs/production-584c98f'
HASHES={'scale-library.js':'9ee07b60eeddce3c890442ebedf8f04fdf06246e97456814bc84fbfe023aa4cd','scale-library.css':'83041b49dffbd61ef71e9575c9f97e1a9b431c9b101ec248799f1a89b2520a89'}
JS_LANGUAGE_REVIEW_SHA='81a1e80900bc3a7bd3bce8055bb2c3481ee688d46639935f082dd5ca4394582b'
CSS_REVIEW_SHA='b6181aef47ae49d0aca9ab05c797421dd08f13e460067a52dafb9aa12504b3f1'
KEYBOARD="""// SK-QA-001: keyboard scrolling belongs only to the focused fretboard region.
const scrollRegion=$('scale-scroll');
scrollRegion.addEventListener('keydown',event=>{
 if(event.target!==scrollRegion||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
 const max=scrollRegion.scrollWidth-scrollRegion.clientWidth;if(max<=1)return;
 const step=Math.max(48,Math.min(240,Math.round(scrollRegion.clientWidth/4)));
 const next={ArrowLeft:scrollRegion.scrollLeft-step,ArrowRight:scrollRegion.scrollLeft+step,Home:0,End:max}[event.key];
 if(next===undefined)return;
 event.preventDefault();scrollRegion.scrollTo({left:Math.max(0,Math.min(max,next)),behavior:'instant'});
});
"""
def keyboard_patch(js):
 marker='syncDisplay();render();})();'
 assert js.count(marker)==1 and 'SK-QA-001' not in js,'Unexpected scale runtime'
 return js.replace(marker,KEYBOARD+marker)
def originals():
 result={n:(BASE/n).read_bytes() for n in HASHES}
 assert all(hashlib.sha256(result[n]).hexdigest()==h for n,h in HASHES.items()),'Scale baseline drift'
 return result
def reviewed():
 old=originals();new={n:(R/n).read_bytes() for n in HASHES}
 keyboard_only=keyboard_patch(old['scale-library.js'].decode()).encode()
 assert (new['scale-library.js']==keyboard_only
         or hashlib.sha256(new['scale-library.js']).hexdigest()==JS_LANGUAGE_REVIEW_SHA),'Unrelated scale JS delta'
 assert new['scale-library.css'].startswith(old['scale-library.css']),'Original scale CSS changed'
 assert len(new['scale-library.css'])>len(old['scale-library.css']),'Missing contrast correction'
 assert hashlib.sha256(new['scale-library.css']).hexdigest()==CSS_REVIEW_SHA,'Unreviewed contrast CSS'
 return old,new
def apply(target):
 old,new=reviewed()
 for pre in ('','en/'):
  for n in HASHES:
   p=Path(target)/pre/n;assert p.read_bytes()==old[n],'Unexpected pre-P1 bytes: '+pre+n;p.write_bytes(new[n])
def reverse(package,out):
 old,new=reviewed();package=Path(package)
 for pre in ('','en/'):
  for n in HASHES:assert (package/pre/n).read_bytes()==new[n],'Unexpected P1 runtime/style: '+pre+n
 shutil.copytree(package,out)
 for pre in ('','en/'):
  for n in HASHES:(Path(out)/pre/n).write_bytes(old[n])

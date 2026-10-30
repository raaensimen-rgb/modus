"""Build a public search index from published article source and navigation routes."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
articles = json.loads((ROOT / "content/articles.json").read_text())
items = [
 {"title":"MODUS JAM","description":"Backingtracks, tonearter og moduser","url":"backingtracks.html","type":"tool","keywords":"jam backingtracks improvisasjon backing track"},
 {"title":"MODUS HARMONI","description":"Akkorder, omvendinger og progresjoner","url":"akkorder.html","type":"tool","keywords":"akkorder harmoni chord progression"},
 {"title":"Teorirommet","description":"Intervaller, skalaer og musikkteori","url":"teori.html","type":"tool","keywords":"teori teorirommet music theory intervals"},
 {"title":"Mitt musikkatlas","description":"Utforsk fagområder og læringsprogresjon","url":"musikkart.html","type":"atlas","keywords":"atlas musikkart music map"},
 {"title":"Læringssti","description":"Utforsk utdanningsløpet","url":"laeringssti.html","type":"learning","keywords":"læring studie kurs learning path"},
 {"title":"Læreplan","description":"Studienivåer og fagområder","url":"laereplan.html","type":"learning","keywords":"læreplan studieplan curriculum"},
 {"title":"Undervisningsrom","description":"Interaktive leksjoner og øvelser under utvikling","url":"undervisning.html","type":"learning","keywords":"leksjoner undervisning lesson exercises"},
 {"title":"Artikler","description":"Les artikler om musikkteori","url":"artikler.html","type":"page","keywords":"artikler fagstoff articles"},
]
for a in articles:
 if a.get("status") in ("planned", "upcoming", "draft"): continue
 items.append({"title":a["title"],"description":a.get("intro",""),"url":"artikler/"+a["slug"]+".html","type":"article","keywords":" ".join([a.get("topic",""),a.get("category",""),a.get("level","")])})
output = ROOT / "dist/search-index.json"
output.write_text(json.dumps(items,ensure_ascii=False,separators=(",",":"))+"\n")
print(f"Generated {len(items)} global search entries.")

# English results are extracted from the built English pages, not machine-translated
# from the Norwegian search index. Unreviewed content is never inferred as published.
from html.parser import HTMLParser
class PageMetadata(HTMLParser):
 def __init__(self):
  super().__init__();self.in_h1=False;self.title=[];self.description=""
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="h1" and not self.title:self.in_h1=True
  if tag=="meta" and a.get("name")=="description":self.description=a.get("content","")
 def handle_endtag(self,tag):
  if tag=="h1":self.in_h1=False
 def handle_data(self,data):
  if self.in_h1:self.title.append(data)
english=[]
for item in items:
 target=ROOT/"dist/en"/item["url"]
 page=PageMetadata()
 if target.is_file():page.feed(target.read_text(encoding="utf-8"))
 title=" ".join(" ".join(page.title).split()) or item["title"]
 english.append({**item,"title":title,"description":page.description or title,
                 "keywords":" ".join((item["keywords"],item["title"],item["description"],title))})
(ROOT/"dist/en/search-index.json").write_text(json.dumps(english,ensure_ascii=False,separators=(",",":"))+"\n")
print(f"Generated {len(english)} English search entries.")

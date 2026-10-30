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

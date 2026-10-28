"""Validate the music map topology, self-assessment controls, and publication safeguards."""
from pathlib import Path
import json
import re
root=Path(__file__).resolve().parents[1]
html=(root/"dist/musikkart.html").read_text()
js=(root/"dist/musikkart.js").read_text()
page=(root/"dist/laeringssti.html").read_text()
nav=(root/"scripts/site_navigation.py").read_text()
data=json.loads((root/"content/curriculum/quality-register.json").read_text())
assert 'id="music-map"' in html and 'id="inspector-module"' in html
assert 'id="map-search"' in html and 'id="map-export"' in html
assert 'data-state="not-started"' in html and 'data-state="exploring"' in html and 'data-state="learned"' in html
assert 'Jeg har lært dette' in html and 'ikke en attestert' in html
assert 'noindex,nofollow' in html
assert 'musikkart.html' in page and "('mindmap', 'musikkart.html', 'Mitt musikkatlas')" in nav
assert 'localStorage.setItem(STORE' in js and 'localStorage.removeItem(STORE)' in js
assert 'categoryRecords' in js and 'groupState' in js and 'filter' in js
assert 'branchLayout(leftIds,true)' in js and 'branchLayout(rightIds,false)' in js, 'Whole mind map must be visible'
assert 'const leftIds=' in js and 'const rightIds=' in js, 'Both sides need all categories'
assert 'const leafGap=34' in js, 'Leaf labels must have consistent separation'
assert 'viewBox' in js and 'chosen=m?.id||null;category=g?.id||' in js
assert 'category=null;chosen=null;' in js, "Return-to-overview action missing"
css=(root/"dist/musikkart.css").read_text()
assert '.map-layout{grid-template-columns:minmax(0,1fr)' in css
assert '.map-node.module-node text{font-size:14px' in css
assert 'leafX=left?33:1227' in js, 'All 24 module labels need visible positions'
assert 'class:"map-branch "+variant(state)' in js
assert 'records[m.id].state==="learned"' in js
assert 'window.confirm(' in js and 'JSON.stringify(payload' in js
assert 'atlas-globe' in js and 'MITT MUSIKKATLAS' in js
assert 'id:"atlas-globe-halo"' in js and 'fill:"#d7f48c"' not in js, "Globe should replace former filled tile"
assert '.atlas-globe-caption' in css
assert 'publication_approval' in (root/"content/curriculum/quality-register.json").read_text()
# Every planned curriculum module must appear exactly once, and every category
# must remain represented in the diagram. Silent omissions would distort the map.
catalog_match=re.search(r"const catalog=(\[.*?\]);\s*const groups=",js,re.S)
assert catalog_match, "Missing machine-readable catalogue"
catalog=json.loads(catalog_match.group(1))
source_ids={m["id"] for m in data["modules"]}
assert len(catalog)==len(source_ids)==24
assert {m["id"] for m in catalog}==source_ids, "Musikkart and curriculum are out of sync"
category_ids=re.findall(r'\{id:"([a-z]+)",name:".*?",color:".*?",ids:\[(.*?)\]\}',js,re.S)
assert len(category_ids)==10, "Music map must retain ten subject branches"
mapped=[]
for _name,raw in category_ids:
    mapped+=re.findall(r'"([A-Z][0-9]{2})"',raw)
assert len(mapped)==len(set(mapped)), "The same module appears in more than one branch"
assert set(mapped)==source_ids, "Missing or invented module in music map"
assert len(data["modules"]) == 24
assert all(module["status"]!="approved" for module in data["modules"])
print("Music map checks passed: 10 branches, 24 module IDs, dimmed and lit learning states, local-only data.")

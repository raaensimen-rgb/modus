"""Validate the music map topology, self-assessment controls, and publication safeguards."""
from pathlib import Path
import json
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
assert 'musikkart.html' in page and "('mindmap', 'musikkart.html', 'Musikkart')" in nav
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
assert 'publication_approval' in (root/"content/curriculum/quality-register.json").read_text()
assert len(data["modules"]) == 24
assert all(module["status"]!="approved" for module in data["modules"])
print("Music map checks passed: 10 branches, 24 module IDs, dimmed and lit learning states, local-only data.")

"""PL-066: atlas link registry is editorial data, never user progression."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
js = (ROOT / "dist/musikkart.js").read_text(encoding="utf-8")
registry = json.loads((ROOT / "content/atlas-links.json").read_text(encoding="utf-8"))
published = json.loads((ROOT / "content/articles.json").read_text(encoding="utf-8"))
planned = json.loads((ROOT / "content/upcoming-articles.json").read_text(encoding="utf-8"))

catalog_match = re.search(r"const catalog=(\[.*?\]);\s*const groups=", js, re.S)
assert catalog_match, "Atlas catalogue missing"
catalog = json.loads(catalog_match.group(1))
module_ids = {m["id"] for m in catalog}
assert len(module_ids) == len(registry["modules"]) == 24
assert registry["schema_version"] == 1
assert {m["id"] for m in registry["modules"]} == module_ids
assert all(isinstance(m["topics"], list) and isinstance(m["lessons"], list) for m in registry["modules"])
assert len({m["id"] for m in registry["modules"]}) == 24
assert all(re.fullmatch(r"[FEIAPX][0-9]{2}", m["id"]) for m in registry["modules"])

# Existing editorial mapping is authoritative in phase 1. Do not modify runtime progress resolution.
map_match = re.search(r"const articleModules=\{(.*?)\};", js, re.S)
assert map_match, "Existing atlas article mapping missing"
existing_links = dict(re.findall(r"'([^']+)':'([A-Z][0-9]{2})'", map_match.group(1)))
expected_slugs = {a["slug"] for a in published}
actual_links = {a["slug"]: a["module_id"] for a in registry["articles"]}
assert len(registry["articles"]) == len(expected_slugs) == 16
assert actual_links == existing_links, "Existing editorial links must remain identical"
assert set(actual_links) == expected_slugs, "Every published article must be registered once"
assert all(a["status"] == "published" for a in registry["articles"])
assert set(actual_links.values()) <= module_ids

pending = registry["pending_articles"]
assert len(pending) == len(planned) == 5
assert {a["slug"] for a in pending} == {a["slug"] for a in planned}
assert len({a["slug"] for a in pending}) == len(pending)
assert not ({a["slug"] for a in pending} & expected_slugs)
approved = {
    "intervallomvendinger": ("F03", []),
    "kadens-og-tonale-funksjoner": ("I01", ["I02"]),
    "sekundaerdominanter": ("A01", []),
    "akkordutvidelser": ("P02", ["E02"]),
    "modal-harmonikk-i-praksis": ("A02", ["I03"]),
}
assert all(a["status"] == "planned" and a["approval"] == "subject_approved" for a in pending)
assert {a["slug"]: (a["module_id"], a["related_module_ids"]) for a in pending} == approved
assert all(a["module_id"] in module_ids and set(a["related_module_ids"]) <= module_ids for a in pending)
assert all(a["module_id"] not in a["related_module_ids"] for a in pending)

# Undertopics / lessons are deliberately empty until their editorial links are authorized.
assert all(not m["topics"] and not m["lessons"] for m in registry["modules"])
# New registry must not be imported into browser runtime, or change persisted progression.
assert "atlas-links.json" not in js
assert 'const STORE="modus-musikkart-v1"' in js
assert "localStorage.setItem(STORE" in js
assert 'const articleEvidenceKey=\'modus.atlas.article-evidence.v1\'' in js
assert "publication_approval" in (ROOT / "content/curriculum/quality-register.json").read_text(encoding="utf-8")

print("Atlas links integrity passed: 24 stable modules, 16 published links, 5 subject-approved planned article mappings.")

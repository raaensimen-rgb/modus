"""Validate the public curriculum outline and its internal approval register."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
register = json.loads((ROOT / "content/curriculum/quality-register.json").read_text(encoding="utf-8"))
page = (ROOT / "dist/laereplan.html").read_text(encoding="utf-8")
navigation = (ROOT / "scripts/site_navigation.py").read_text(encoding="utf-8")
modules = register["modules"]
allowed = set(register["policy"]["status_values"])
assert len(modules) == 24, "Expected 24 initial planned modules"
assert len({m["id"] for m in modules}) == len(modules), "Duplicate curriculum IDs"
assert re.search(r'<meta name="robots" content="noindex,nofollow">', page), "Preview must not be indexed"
assert "laereplan.html" in navigation, "Curriculum must appear in shared navigation"
assert page.count('class="level-detail"') == 6, "Expected six accessible details panels"
assert page.count('<details class="level-card"') == 6
assert "<summary class=\"level-summary\">" in page
assert 'class="level-instruction"' in page
for m in modules:
    assert m["status"] in allowed, "Invalid status"
    assert 1 <= m["level"] <= 6
    assert m["title"] in page, "Module missing from page: " + m["id"]
    assert m["id"] in page, "Module ID missing from page"
    if m["status"] == "approved":
        assert m["sources"], "Approved module lacks sources"
        assert m["competency_evidence"], "Approved module lacks documented mastery"
        assert m["editorial_review"]["approved"] is True, "Editorial review missing"
        assert m["editorial_review"]["reviewed_at"], "Editorial review date missing"
        assert m["publication_approval"]["approved"] is True, "Publishing approval missing"
        assert m["publication_approval"]["approved_at"], "Publication date missing"
    else:
        assert not m["publication_approval"]["approved"], "Unapproved module marked publishable"
print("Curriculum checks passed (6 levels, 24 modules, approval gate).")

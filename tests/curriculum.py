"""Validate the public curriculum outline and its internal approval register."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
register = json.loads((ROOT / "content/curriculum/quality-register.json").read_text(encoding="utf-8"))
page = (ROOT / "dist/laereplan.html").read_text(encoding="utf-8")
navigation = (ROOT / "scripts/site_navigation.py").read_text(encoding="utf-8")
learning_path = (ROOT / "dist/laeringssti.html").read_text(encoding="utf-8")
frontpage = (ROOT / "dist/index.html").read_text(encoding="utf-8")
lesson = (ROOT / "dist/undervisning.html").read_text(encoding="utf-8")
lesson_js = (ROOT / "dist/undervisning.js").read_text(encoding="utf-8")
atelier_js = (ROOT / "dist/f03-atelier.js").read_text(encoding="utf-8")
modules = register["modules"]
allowed = set(register["policy"]["status_values"])
assert len(modules) == 24, "Expected 24 initial planned modules"
assert len({m["id"] for m in modules}) == len(modules), "Duplicate curriculum IDs"
assert re.search(r'<meta name="robots" content="noindex,nofollow">', page), "Preview must not be indexed"
assert "laereplan.html" in navigation, "Curriculum must appear in shared navigation"
assert "('path', 'laeringssti.html', 'Læringssti')" in navigation
assert "('course', 'laer-dorisk.html', 'Dorisk leksjon')" in navigation
assert 'href="laeringssti.html" class="button">Start læringsstien' in frontpage
assert 'href="laer-dorisk.html"' in learning_path
assert 'href="undervisning.html?modul=F03"' in learning_path
assert 'href="laereplan.html"' in learning_path
assert page.count('class="level-detail"') == 6
assert page.count("undervisning.html?modul=") == 24, "Module links missing"
assert "undervisning.html" in navigation
assert 'noindex,nofollow' in lesson
assert "data-note" in lesson and "play-sequence" in lesson
assert "new AudioContextClass()" in lesson_js
assert "audio/grand-" in lesson_js and "createBufferSource()" in lesson_js
assert "createOscillator()" not in lesson_js, "Sine-wave audio is not the default"
assert "ikke godkjent undervisning" in lesson
assert 'id="f03-draft" hidden' in lesson, "F03 must not default to public course content"
assert "interval-answer" in lesson and "interval-melodic" in lesson
assert all('id="' + stage + '"' in lesson for stage in ("f03-understand","f03-hear","f03-play","f03-explain","f03-apply"))
assert all('id="' + control + '"' in lesson for control in ("f03-difficulty","f03-new-question","f03-listen","f03-ear-answers","f03-piano","f03-fretboard"))
assert "f03-atelier.js" in lesson and "playGrandMidi" in lesson_js
assert "MODUSGrand.playMidi" in atelier_js and "audio/grand-" in lesson_js
assert "stage.revealed=false" in atelier_js and "render(null" in atelier_js
assert "Ingen resultat lagres" in lesson
assert (ROOT / "docs/curriculum-f03-evidence.md").is_file()
assert 'code==="F03"' in lesson_js
assert "Dette er en øvelsessjekk, ikke dokumentert mestring." in lesson_js
assert (ROOT / "docs/curriculum-editor.html").is_file(), "Expected six accessible details panels"
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

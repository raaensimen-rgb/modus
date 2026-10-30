"""Check translation catalogue integrity, not linguistic or editorial approval.

Only registered source strings still present in public Norwegian HTML require
coverage. Retired inventory entries must not force obsolete translations.
Existing site/language tests also check generated pages and local links.
"""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
ATTRS = {"title", "aria-label", "aria-description", "placeholder", "alt", "content", "data-search"}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate translation key: {key!r}")
        result[key] = value
    return result


class VisibleStrings(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.strings = set()
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if not self.skip:
            self.strings.update(value.strip() for key, value in attrs if key in ATTRS and value)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag in ("script", "style"):
            self.skip -= 1

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip and data.strip():
            self.strings.add(data.strip())


def validate(sources, translations, dynamic_text, active):
    if not isinstance(sources, list) or not all(isinstance(s, str) and s.strip() for s in sources):
        raise ValueError("Source inventory must be a list of non-empty strings")
    if not isinstance(translations, dict):
        raise ValueError("English catalogue must be an object")
    merged = dict(translations)
    dynamic_keys = set()
    for number, line in enumerate(dynamic_text.splitlines(), 1):
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) != 2 or not all(part.strip() for part in parts):
            raise ValueError(f"Invalid dynamic.tsv entry on line {number}")
        source, target = parts
        if source in dynamic_keys:
            raise ValueError(f"Duplicate dynamic translation on line {number}: {source!r}")
        dynamic_keys.add(source)
        merged[source] = target  # Same precedence as build-languages.py.
    for source, target in translations.items():
        if not isinstance(source, str) or not source.strip() or not isinstance(target, str) or not target.strip():
            raise ValueError(f"Empty or invalid translation: {source!r}")
    required = set(sources) & active
    if not required:
        raise ValueError("No registered source strings found in built HTML; build the site first")
    missing = sorted(required - merged.keys())
    if missing:
        raise ValueError("Missing registered English translations:\n" + "\n".join(repr(s) for s in missing))
    return len(required), len(set(sources) - active)


def main():
    directory = ROOT / "content/i18n"
    sources = json.loads((directory / "source-strings.json").read_text(encoding="utf-8"))
    translations = json.loads((directory / "en.json").read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    active = set()
    pages = [p for p in (ROOT / "dist").rglob("*.html")
             if "en" not in p.relative_to(ROOT / "dist").parts and p.name != "redaktor.html"]
    if not pages:
        raise ValueError("No built Norwegian pages; run npm run build first")
    for page in pages:
        parser = VisibleStrings()
        parser.feed(page.read_text(encoding="utf-8"))
        active.update(parser.strings)
    count, inactive = validate(sources, translations, (directory / "dynamic.tsv").read_text(encoding="utf-8"), active)
    print(f"Translation catalogue passed: {count} active registered strings covered; {inactive} inventory strings not present as complete HTML text/attributes.")
    print("Scope: catalogue coverage and format only; new unregistered text, dynamic JS and language quality still require review.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(f"Translation check failed: {error}", file=sys.stderr)
        sys.exit(1)

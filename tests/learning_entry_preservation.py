"""Check the exact learning entry transform before historical preservation tests."""
from pathlib import Path
from learning_entry import COPY, render

BASE = Path(__file__).resolve().parents[1] / "release-inputs/production-6b089d6"


def original_pages(package):
    originals = {}
    for prefix, copy in COPY.items():
        name = prefix + "undervisning.html"
        original = (BASE / name).read_bytes()
        expected = render(original.decode(), copy).encode()
        assert (package / name).read_bytes() == expected, f"Unreviewed entry delta: {name}"
        originals[name] = original
    return originals

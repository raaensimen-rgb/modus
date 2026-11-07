"""Apply the transport change to the existing published Harmony pages."""
from pathlib import Path
import json
import re
from learning_menu_copy import update

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'release-inputs/production-584c98f'
FILES = {prefix + name for prefix in ('', 'en/') for name in
         ('akkorder.html', 'chord-tool.js', 'chord-tool.css')}


TRANSLATIONS = {
    'Gjenta akkordrekken': 'Loop progression',
    'Gjentar akkordrekken på flygel…': 'Looping the progression on grand piano…',
}


def transport(code):
    start = code.index('let playback=null,')
    end = code.index("window.addEventListener('pagehide'", start)
    return code[start:end]


def apply(package):
    checkbox = re.search(r'<label for="loopProgression">.*?</label>',
                         (ROOT / 'akkorder.html').read_text())[0]
    code = transport((ROOT / 'chord-tool.js').read_text())
    css = (ROOT / 'chord-tool.css').read_text()
    translations = json.loads((ROOT / 'content/i18n/en.json').read_text())
    translations.update(line.split('\t', 1) for line in
                        (ROOT / 'content/i18n/dynamic.tsv').read_text().splitlines() if line)
    translations.update(TRANSLATIONS)
    translate = lambda match: "'" + translations.get(match[1], match[1]) + "'"

    for prefix in ('', 'en/'):
        for name in ('akkorder.html', 'chord-tool.js', 'chord-tool.css'):
            path = package / (prefix + name)
            original = (BASE / (prefix + name)).read_text()
            if name == 'akkorder.html':
                original = update(original.encode()).decode()
            assert path.read_text() == original, f'Unexpected Harmony input: {prefix}{name}'
            if name == 'akkorder.html':
                label = checkbox.replace('Gjenta akkordrekken', translations['Gjenta akkordrekken']) if prefix else checkbox
                button = re.search(r'<button [^>]*id="playProgression"[^>]*>.*?</button>', original)[0]
                updated = original.replace(button, button + label, 1)
            elif name == 'chord-tool.js':
                localized = re.sub(r"'([^'\n]+)'", translate, code) if prefix else code
                updated = original.replace(transport(original), localized, 1)
            else:
                base_css = (BASE / name).read_text()
                assert css.startswith(base_css)
                updated = original + css[len(base_css):]
            path.write_text(updated)


def restore_reviewed_files(package):
    """Normalize only the exact Harmony overlay for legacy preservation tests."""
    import shutil
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        expected = Path(tmp)
        for name in FILES:
            target = expected / name
            target.parent.mkdir(parents=True, exist_ok=True)
            original = (BASE / name).read_bytes()
            target.write_bytes(update(original) if name.endswith('.html') else original)
        apply(expected)
        for name in FILES:
            assert (package / name).read_bytes() == (expected / name).read_bytes(), name
    for name in FILES:
        shutil.copyfile(BASE / name, package / name)

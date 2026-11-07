"""Build UX-002 from the verified public package, with a strict local delta."""
import argparse
import json
from pathlib import Path
import re
import shutil
from tempfile import TemporaryDirectory

from production_workflow import (
    MANIFEST, ROOT, archive, config, digest, git, inventory, public_boundary,
    source_gate, write,
)

FIRST = 'toner-og-intervaller'
PIANO = f'teori.html?topic=intervals&amp;key=0&amp;fromArticle={FIRST}&amp;interval=4'
ATLAS = 'musikkart.html?modul=F03#inspector-heading'


def replace_once(page, old, new):
    if page.count(old) != 1:
        raise ValueError(f'Expected one occurrence of {old!r}')
    return page.replace(old, new, 1)


def edit(path, transform):
    path.write_text(transform(path.read_text()), encoding='utf-8')


def apply(package):
    changed = set()
    for prefix in ('', 'en/'):
        root = package / prefix
        en = prefix == 'en/'

        def text(nb, english):
            return english if en else nb

        def update(name, transform):
            edit(root / name, transform)
            changed.add(prefix + name)

        update('index.html', lambda page: replace_once(
            page, 'href="laeringssti.html" data-start-learning',
            'href="artikler.html" data-start-learning'))
        update('artikler.html', lambda page: replace_once(
            page,
            text('>Studierute ↗</a>', '>Study route ↗</a>'),
            text('>Valgfri leserekkefølge ↗</a>', '>Optional reading order ↗</a>')))

        intro = text(
            'Teoriartiklene er undervisningen. Bruk Studieruten som en valgfri leserekkefølge, eller velg et tema selv.',
            'The theory articles are the lessons. Use the study route as an optional reading order, or choose a topic yourself.',
        )
        route_links = (
            '<div class="route-actions"><a href="artikler.html">'
            + text('Bla i teoriartiklene', 'Browse theory articles')
            + f'</a><a href="{ATLAS}">'
            + text('Se toner og intervaller i Musikkatlas (F03)',
                   'See notes and intervals in the Music Atlas (F03)')
            + '</a></div>'
        )
        for name in ('laeringssti.html', 'grunnstudier.html', 'studierute.html'):
            update(name, lambda page: replace_once(
                page,
                text('En veiledet leserekkefølge gjennom publiserte artikler. Les, lytt og prøv ved instrumentet.',
                     'A guided reading order through published articles. Read, listen and try at your instrument.') + '</p></header>',
                intro + '</p></header>' + route_links))

        catalog = (root / 'artikler.html').read_text()
        ids = set(re.findall(r'data-article-id="([a-z0-9-]+)"', catalog))
        if len(ids) != (16 if en else 52) or FIRST not in ids:
            raise ValueError('Unexpected public article inventory')

        def reader(page):
            page = replace_once(page,
                text('>Tilbake til studieruten</a>', '>Back to the study route</a>'),
                text('>Se valgfri leserekkefølge</a>', '>See the optional reading order</a>'))
            if 'id="route-practice"' not in page:
                raise ValueError('Missing existing article exercise')
            # The first article already has a specific, working piano shortcut.
            # Other articles link to their actual exercise rather than a generic tab.
            new_link = (
                '<a class="start-practice" href="#route-practice"><span>'
                + text('Valgfri øvelse', 'Optional practice') + '</span><strong>'
                + text('Se instrumentoppgaven', 'See the instrument exercise')
                + '</strong></a>'
            )
            link = re.search(r'<a class="start-practice" href="[^"]+">[\s\S]*?</a>', page)
            if not link:
                raise ValueError('Missing existing practice shortcut')
            return replace_once(page, link[0], new_link)

        for slug in sorted(ids - {FIRST}):
            update(f'artikler/{slug}.html', reader)
        update(f'artikler/{FIRST}.html', lambda page: replace_once(
            page, text('>Tilbake til studieruten</a>', '>Back to the study route</a>'),
            text('>Se valgfri leserekkefølge</a>', '>See the optional reading order</a>')))

        read_label = text('Les Toner og intervaller', 'Read Notes and Intervals')
        play_label = text('Prøv intervaller på pianoet', 'Try intervals on the piano')
        article = f'artikler/{FIRST}.html'

        def atlas_page(page):
            page = replace_once(page,
                '<a href="undervisning.html?modul=F03">Utforsk intervallutkastet ↗︎</a>',
                f'<div class="map-hero-links"><a href="{article}">{read_label}</a>'
                f'<a href="{PIANO}">{play_label}</a></div>')
            page = replace_once(page,
                '<div class="map-actions"><a id="module-open" href="laereplan.html">Se læreplanen ↗︎</a></div>',
                '')
            meta = '<p id="inspector-meta" class="map-meta"></p>'
            page = replace_once(page, meta,
                meta + '<div class="map-hero-links">'
                f'<a id="module-open" href="laereplan.html">{text("Se læreplanen", "View the curriculum")}</a>'
                f'<a id="module-practice" href="{PIANO}" hidden>{play_label}</a></div>')
            return replace_once(page,
                text('<a href="laeringssti.html">← Læringsstien</a>', '<a href="laeringssti.html">← Learning path</a>'),
                '<a href="grunnstudier.html">'
                + text('← Valgfri leserekkefølge', '← Optional reading order') + '</a>')

        update('musikkart.html', atlas_page)

        def atlas_script(page):
            old = (
                ' $("module-open").href=m?"undervisning.html?modul="+encodeURIComponent(m.id):"laereplan.html";\n'
                ' $("module-open").textContent=m?'
                + json.dumps(text('Åpne modulvisning ↗', 'Open module view ↗'), ensure_ascii=False) + ':'
                + json.dumps(text('Se hele læreplanen ↗', 'Explore the curriculum ↗'), ensure_ascii=False) + ';'
            )
            # Reuse the existing Atlas registry and selection function. Only
            # F03 has the reviewed direct article and piano pair in this route.
            new = (
                f' const intervals = m?.id === articleModules["{FIRST}"];\n'
                f' $("module-open").href = intervals ? "{article}" : "laereplan.html";\n'
                ' $("module-open").textContent = intervals ? '
                + json.dumps(read_label, ensure_ascii=False) + ' : '
                + json.dumps(text('Se læreplanen', 'View the curriculum'), ensure_ascii=False) + ';\n'
                ' $("module-practice").hidden = !intervals;'
            )
            page = replace_once(page, old, new)
            return replace_once(page, '\nrender();\n', (
                '\nconst requestedModule = new URLSearchParams(location.search).get("modul");\n'
                f'if (requestedModule === articleModules["{FIRST}"]) {{\n'
                ' choose("module", requestedModule);\n'
                '} else {\n'
                ' render();\n'
                '}\n'
            ))

        update('musikkart.js', atlas_script)

    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True,
                        help='Verified production publication directory')
    parser.add_argument('--live-manifest', type=Path, required=True,
                        help='Captured manifest from the public production URL')
    parser.add_argument('--out', type=Path, required=True, help='New candidate directory')
    args = parser.parse_args()
    if args.out.exists():
        parser.error('--out must be a new directory')
    baseline = config(ROOT, args.baseline)
    if digest(args.live_manifest.read_bytes()) != baseline['files'][MANIFEST]:
        raise ValueError('Live manifest does not match the verified production receipt')
    provenance = source_gate(ROOT, git(ROOT, 'rev-parse', 'HEAD'), baseline)
    args.out.parent.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(dir=args.out.parent) as temporary:
        staging = Path(temporary)
        package = staging / 'package'
        shutil.copytree(baseline['package'], package)
        allowed = apply(package)
        files = inventory(package)
        changed = {name for name, checksum in files.items() if baseline['files'].get(name) != checksum}
        if files.keys() != baseline['files'].keys() or changed != allowed:
            raise ValueError('Unexpected package delta')
        files.pop(MANIFEST)
        public_boundary(package, files, baseline)
        manifest = {
            'schema_version': 1, 'kind': 'modus-public-candidate', 'project': baseline['project'],
            'project_id': baseline['project_id'], 'production_origin': baseline['origin'],
            **provenance, 'public_baseline_sha': baseline['source_sha'],
            'public_baseline_deployment': baseline['deployment_id'], 'deploy_authorized': False,
            'approval_required': True, 'backend': 'disabled', 'cms_seed_records': 0,
            'public_fulltexts': baseline['public_fulltexts'],
            'delta': {'changed': sorted(changed), 'added': [], 'removed': []}, 'files': files,
        }
        write(package / MANIFEST, manifest)
        zip_hash = archive(package, staging / 'UX-002.zip')
        write(staging / 'BUILD.json', {
            **provenance, 'baseline_sha': baseline['source_sha'],
            'baseline_deployment': baseline['deployment_id'],
            'baseline_manifest_sha256': baseline['files'][MANIFEST],
            'manifest_sha256': digest((package / MANIFEST).read_bytes()),
            'zip_sha256': zip_hash, 'delta': manifest['delta'],
            'unchanged_files': len(files) - len(changed), 'total_files': len(files) + 1,
            'deploy_authorized': False,
        })
        args.out.mkdir()
        for name in ('package', 'UX-002.zip', 'BUILD.json'):
            (staging / name).rename(args.out / name)
    print(f'Built UX-002 from {baseline["source_sha"]}: {len(changed)} changed public files.')


if __name__ == '__main__':
    main()

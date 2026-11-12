"""Overlay the reviewed education articles on the exact published package."""
import argparse
import json
from pathlib import Path
import re
import shutil
from tempfile import TemporaryDirectory

from production_workflow import MANIFEST, ROOT, digest, git, inventory, manifest, read, write

NEW = ('dorisk-fra-d-over-a', 'da-sju-takter-var-nok')
EXTENDED = 'tonikalisering-og-modulering'

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected exactly one occurrence of {old}')
    return text.replace(old, new, 1)

def splice_listing(text, generated):
    # Insert after the last existing card in the advanced reading group.
    cards = []
    for slug in NEW:
        pattern = r'<article\b[^>]*data-article-id="' + slug + r'"[^>]*>.*?</article>'
        matches = re.findall(pattern, generated, re.S)
        if len(matches) != 1:
            raise ValueError(f'Expected one generated card for {slug}')
        cards.extend(matches)
    groups = list(re.finditer(r'<section class="article-category" data-category="reading-advanced">.*?</section>', text, re.S))
    live_groups = [m for m in groups if 'data-article-id' in m[0]]
    if len(live_groups) != 1:
        raise ValueError('Expected one populated advanced reading group')
    group = live_groups[0]
    end = group.end() - len('</div></section>')
    if not group[0].endswith('</div></section>'):
        raise ValueError('Unexpected reading group markup')
    text = text[:end] + ''.join(cards) + text[end:]
    for before, after in [('Alle <span>52</span>', 'Alle <span>54</span>'),
                          ('>52 artikler</span>', '>54 artikler</span>'),
                          ('>0 av 52 quizer fullført</strong>', '>0 av 54 quizer fullført</strong>')]:
        text = replace_once(text, before, after)
    for attribute, value, increment in (
        ('data-filter', 'advanced', len(NEW)), ('data-topic-filter', 'modes', 1),
        ('data-topic-filter', 'rhythm', 1),
    ):
        pattern = rf'(<button[^>]*{attribute}="{value}"[^>]*>[^<]*<span>)([0-9]+)(</span>)'
        text, count = re.subn(pattern, lambda m: m[1] + str(int(m[2]) + increment) + m[3], text)
        if count != 1:
            raise ValueError(f'Expected one initial count for {value}')
    return text

def splice_extension(text, generated):
    old_section = '<section id="del-5"><h2>Kildegrunnlag og faglig status</h2>'
    text = replace_once(text, old_section, old_section.replace('del-5', 'del-7'))
    text = replace_once(text, '<a href="#del-5">Kildegrunnlag og faglig status</a>',
                        '<a href="#del-5">To lokale mål i samme mollfrase</a>'
                        '<a href="#del-6">Prøv samme lesemåte i E-moll</a>'
                        '<a href="#del-7">Kildegrunnlag og faglig status</a>')
    sections = []
    for index in (5, 6):
        match = re.search(rf'<section id="del-{index}">.*?</section>', generated, re.S)
        if not match:
            raise ValueError('Missing generated article extension')
        sections.append(match[0])
    marker = old_section.replace('del-5', 'del-7')
    return replace_once(text, marker, ''.join(sections) + marker)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--baseline-deployment', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    baseline = read(args.baseline / MANIFEST)
    files = inventory(args.baseline)
    if (files.pop(MANIFEST) != args.manifest_sha256 or files != baseline['files']
            or baseline['public_fulltexts'] != {'nb': 52, 'en': 16}):
        raise ValueError('Production baseline differs from the verified article package')
    sha = git(ROOT, 'rev-parse', 'HEAD')
    if git(ROOT, 'status', '--porcelain'):
        raise ValueError('Commit the article source before packaging')
    dist = ROOT / 'dist'
    with TemporaryDirectory(dir=args.out.parent) as temporary:
        package = Path(temporary) / 'package'
        shutil.copytree(args.baseline, package)
        for name in NEW:
            page = (dist/'artikler'/f'{name}.html').read_text()
            page, count = re.subn(r'\.\./account\.[a-f0-9]+\.js', '../account.js', page)
            if count != 1:
                raise ValueError('Unexpected account script reference')
            page = replace_once(page, '<script src="../article-quiz.js',
                                '<script src="../library-ids.js"></script><script src="../article-quiz.js')
            (package/'artikler'/f'{name}.html').write_text(page)
            for asset in (f'images/articles/{name}.svg', f'images/teaching-diagrams/{name}.svg',
                          f'images/teaching-diagrams/{name}-card.svg'):
                shutil.copyfile(dist/asset, package/asset)
        library = package/'artikler.html'
        library.write_text(splice_listing(library.read_text(), (dist/'artikler.html').read_text()))
        library_en = package/'en/artikler.html'
        library_en.write_text(library_en.read_text().replace('52 Norwegian', '54 Norwegian'))
        extension = package/'artikler'/f'{EXTENDED}.html'
        extension.write_text(splice_extension(extension.read_text(), (dist/'artikler'/extension.name).read_text()))
        css = package/'articles.css'
        badge_rules = (ROOT/'articles.css').read_text().split('.article-card .card-level-row:has(.article-new-badge)', 1)
        css.write_text(css.read_text() + '\n.article-card .card-level-row:has(.article-new-badge)' + badge_rules[1])
        index = package/'search-index.json'
        entries = [item for item in read(dist/'search-index.json') if Path(item['url']).stem in NEW]
        if len(entries) != len(NEW):
            raise ValueError('New articles are missing from the search index')
        write(index, read(index) + entries)
        library_ids = package/'library-ids.js'
        old_ids = json.loads(library_ids.read_text().removeprefix('window.MODUS_CMS_IDS=').strip().removesuffix(';'))
        library_ids.write_text('window.MODUS_CMS_IDS=' + json.dumps(old_ids + list(NEW)) + ';\n')
        actual = inventory(package)
        actual.pop(MANIFEST)
        delta = dict(changed=sorted(name for name in files if files[name] != actual[name]),
                     added=sorted(actual.keys() - files.keys()), removed=[])
        expected = {'artikler.html', 'en/artikler.html', f'artikler/{EXTENDED}.html', 'articles.css',
                    'search-index.json', 'library-ids.js'}
        if set(delta['changed']) != expected or len(delta['added']) != 4 * len(NEW):
            raise ValueError(f'Unexpected article release delta {delta}')
        c = dict(source_sha=baseline['source_sha'], deployment_id=args.baseline_deployment,
                 public_fulltexts={'nb': 54, 'en': 16})
        release = dict(baseline, source_sha=sha, source_tree=git(ROOT, 'rev-parse', 'HEAD^{tree}'),
                       source_branch=git(ROOT, 'branch', '--show-current'), public_baseline_sha=c['source_sha'],
                       public_baseline_deployment=c['deployment_id'], public_fulltexts=c['public_fulltexts'],
                       deploy_authorized=False, files=actual, delta=delta)
        write(package/MANIFEST, release)
        manifest(package, sha, c)
        if args.out.exists():
            raise ValueError('Choose a new candidate folder')
        package.rename(args.out)
        print(json.dumps(delta, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()

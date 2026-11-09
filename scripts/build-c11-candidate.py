"""Build and seal the C11 review package from verified production and generated JS."""
import argparse
import os
import re
import shutil
from pathlib import Path

import production_workflow as workflow


def build(out, baseline_dir):
    root = workflow.ROOT
    baseline = workflow.config(root, baseline_dir)
    source = workflow.source_gate(root, workflow.git(root, 'rev-parse', 'HEAD'), baseline)
    out.mkdir(parents=True)
    env = {key: value for key, value in os.environ.items()
           if not key.startswith(('MODUS_', 'CF_PAGES_', 'CONTEXT'))}
    workflow.run_stage(root, ['npm', 'run', 'build'], out / 'build.log', env)
    workflow.source_gate(root, source['source_sha'], baseline)

    package = out / 'package'
    shutil.copytree(root / baseline['package'], package)
    changed = []
    for prefix in ('', 'en/'):
        for filename in ('articles.js', 'global-search.js', 'theory.js'):
            name = prefix + filename
            generated = (root / 'dist' / name).read_bytes()
            if filename == 'articles.js':
                # The production catalog has a curated order unavailable in raw dist.
                order = rb'^ const orderedIds=.*;$'
                published_order, = re.findall(order, (package / name).read_bytes(), re.M)
                generated, count = re.subn(order, lambda _: published_order, generated, flags=re.M)
                if count != 1:
                    raise ValueError(f'Expected one catalog order in {name}')
            (package / name).write_bytes(generated)
            changed.append(name)

    scope = workflow.read(root / 'release-inputs/production-delta.json')
    delta = workflow.check_delta(package, baseline, scope)
    if sorted(changed) != delta['changed']:
        raise ValueError('C11 build does not match the allowed runtime scope')
    files = workflow.inventory(package)
    workflow.public_boundary(package, files, baseline)

    env['MODUS_TEST_DIST'] = str(package)
    env['C11_RESULTS'] = str(out / 'c11-browser.json')
    stages = [{'name': 'build', 'status': 'passed'}]
    env['MODUS_PIANO_THEORY_ONLY'] = '1'
    for test in ('c11-quality-browser', 'release-browser', 'learning-entry-browser', 'piano-browser'):
        workflow.run_stage(root, ['node', f'tests/{test}.cjs'], out / f'{test}.log', env)
        stages.append({'name': test, 'status': 'passed'})
    results = workflow.read(out / 'c11-browser.json')
    if (results['passed'], results['failed']) != (72, 0):
        raise ValueError('C11 requires all 72 browser scenarios')
    if workflow.inventory(package) != files:
        raise ValueError('Package changed during QA')
    workflow.source_gate(root, source['source_sha'], baseline)
    qa = dict(status='LOCAL_CANDIDATE_PASSED', sourceSha=source['source_sha'],
              delta=delta, stages=stages, c11_scenarios=results['passed'],
              evidence={log.name: workflow.digest(log.read_bytes()) for log in sorted(out.glob('*.log'))})
    result = workflow.seal_candidate(out, baseline, source, delta, qa)
    workflow.write(out / 'report.json', result)
    workflow.candidate(root, out, baseline)
    print(result)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    build(args.out.resolve(), args.baseline.resolve())

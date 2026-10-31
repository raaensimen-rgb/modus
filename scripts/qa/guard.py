"""Trusted, offline QA guards. Never import or execute uploaded site code."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys

APPROVED_PROJECTS = frozenset({'modus-qa'})
PRODUCTION_BRANCH = 'qa-production-disabled'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def dispatch(env):
    require(env.get('GITHUB_REPOSITORY') == 'raaensimen-rgb/modus', 'Unexpected repository')
    require(env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch', 'Manual dispatch required')
    require(env.get('GITHUB_REF') == 'refs/heads/main', 'Trusted main workflow required')
    require(env.get('QA_ENABLED') == 'true', 'QA is not enabled by repository owner')
    require(env.get('QA_PROJECT') in APPROVED_PROJECTS, 'Project is not explicitly approved for QA')
    require(re.fullmatch('[0-9a-f]{40}', env.get('SOURCE_SHA', '')), 'Full lowercase source commit SHA required')
    for key in ('QA_ACCOUNT_ID', 'PRODUCTION_ACCOUNT_ID'):
        require(re.fullmatch('[0-9a-f]{32}', env.get(key, '')), f'Missing or invalid {key}')
    require(env['QA_ACCOUNT_ID'] != env['PRODUCTION_ACCOUNT_ID'], 'QA must use a separate Cloudflare account')
    return env['QA_PROJECT']


def tests_passed(report):
    require(isinstance(report, dict), 'Test report must be an object')
    results = report.get('results')
    require(isinstance(results, list) and bool(results), 'Nonempty test results required')
    require(report.get('total') == report.get('passed') == len(results), 'All test entries must pass')
    require(report.get('failed') == 0, 'Failed test entries block deployment')
    require(all(r.get('status') == 'passed' and r.get('exitCode') == 0 for r in results), 'Failed or incomplete test blocks deployment')


def site_manifest(directory):
    directory = Path(directory)
    require(directory.is_dir() and not directory.is_symlink(), 'Static site directory required')
    found = {}
    for file in sorted(directory.rglob('*')):
        require(not file.is_symlink(), 'Symlinks are forbidden in QA artifacts')
        if file.name == '.gitkeep' and file.is_file() and file.read_bytes() in (b'', b'MODUS\n'):
            continue  # Known repository placeholders are never published.
        rel = file.relative_to(directory)
        require(not any(p.startswith('.') for p in rel.parts), 'Hidden files are forbidden in QA site')
        require(not any(p in {'functions', 'node_modules', '_worker.js', '_routes.json'} for p in rel.parts), 'Server runtime is forbidden in static QA')
        require(file.name not in {'wrangler.toml', 'wrangler.json', 'wrangler.jsonc', 'package.json', 'package-lock.json'}, 'Build/deployment configuration must not be uploaded as site data')
        if file.is_dir():
            continue
        require(file.is_file(), 'Only regular static files are allowed')
        require(file.stat().st_size <= 25 * 1024 * 1024, 'File exceeds Pages size limit')
        found[rel.as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    require('index.html' in found and 'en/index.html' in found, 'Both public locale entry points required')
    require(len(found) <= 20000, 'Static QA file limit exceeded')
    return found


def verify_payload(payload, source_sha):
    payload = Path(payload)
    require(not payload.is_symlink(), 'Payload symlink forbidden')
    for name in ('manifest.json', 'test-results.json'):
        require(not (payload / name).is_symlink(), 'Evidence symlink forbidden')
    manifest = json.loads((payload / 'manifest.json').read_text())
    require(manifest.get('source_sha') == source_sha, 'Artifact source SHA mismatch')
    tests_passed(json.loads((payload / 'test-results.json').read_text()))
    require(manifest.get('files') == site_manifest(payload / 'site'), 'Static artifact checksum mismatch')
    return manifest


def package(source, output, env):
    source, output = Path(source), Path(output)
    report = json.loads((source / 'test-results/test-results.json').read_text())
    tests_passed(report)
    site_manifest(source / 'dist')
    require(not output.exists(), 'Payload destination must be new')
    output.mkdir(parents=True)
    shutil.copytree(source / 'dist', output / 'site', ignore=shutil.ignore_patterns('.gitkeep'))
    shutil.copyfile(source / 'test-results/test-results.json', output / 'test-results.json')
    identity = {'source_sha': env['SOURCE_SHA'], 'workflow_sha': env.get('GITHUB_WORKFLOW_SHA'),
                'run_id': env.get('GITHUB_RUN_ID'), 'run_attempt': env.get('GITHUB_RUN_ATTEMPT')}
    (output / 'site/qa-build.json').write_text(json.dumps(identity) + '\n')
    manifest = {**identity, 'files': site_manifest(output / 'site')}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    verify_payload(output, env['SOURCE_SHA'])


def evidence(directory, env):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    record = {key: env.get(key, 'not_available') for key in
              ('SOURCE_SHA', 'GITHUB_WORKFLOW_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'PREFLIGHT_OUTCOME', 'BUILD_OUTCOME', 'TEST_OUTCOME')}
    (directory / 'qa-execution.json').write_text(json.dumps(record, indent=2) + '\n')
    summary = f"## MODUS QA\n\nSource: `{record['SOURCE_SHA']}`\n\nPreflight: {record['PREFLIGHT_OUTCOME']} · Build: {record['BUILD_OUTCOME']} · Tests: {record['TEST_OUTCOME']}\n\nEvidence: qa-tests-{record['GITHUB_RUN_ID']}-{record['GITHUB_RUN_ATTEMPT']} (or qa-preflight for preflight)\n"
    report_file = directory / 'test-results.json'
    if report_file.is_file():
        report = json.loads(report_file.read_text())
        summary += f"\nPassed: {report.get('passed')} / {report.get('total')} · Failed: {report.get('failed')}\n"
    else:
        summary += '\nNo test report. This is not a passing QA run.\n'
    if env.get('GITHUB_STEP_SUMMARY'):
        with open(env['GITHUB_STEP_SUMMARY'], 'a') as stream:
            stream.write(summary)


if __name__ == '__main__':
    try:
        command = sys.argv[1]
        if command == 'dispatch': dispatch(os.environ)
        elif command == 'package': package(sys.argv[2], sys.argv[3], os.environ)
        elif command == 'evidence': evidence(sys.argv[2], os.environ)
        else: raise ValueError('Unknown QA guard command')
    except (ValueError, OSError, KeyError) as error:
        print(f'QA blocked: {error}', file=sys.stderr)
        sys.exit(1)

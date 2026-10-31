"""Offline security/regression tests. All API and deployment operations are fake."""
from copy import deepcopy
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/qa'))
from guard import dispatch, tests_passed, site_manifest, package, verify_payload, evidence
from deploy import deploy, validate_project
from workflow import validate_workflow

SHA = 'a' * 40
ENV = {'GITHUB_REPOSITORY': 'raaensimen-rgb/modus', 'GITHUB_EVENT_NAME': 'workflow_dispatch',
       'GITHUB_REF': 'refs/heads/main', 'QA_ENABLED': 'true', 'QA_PROJECT': 'modus-qa',
       'QA_ACCOUNT_ID': '1' * 32, 'PRODUCTION_ACCOUNT_ID': '2' * 32, 'SOURCE_SHA': SHA,
       'GITHUB_WORKFLOW_SHA': 'b' * 40, 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1',
       'CLOUDFLARE_API_TOKEN': 'offline-test-value-not-a-credential'}
REPORT = {'total': 1, 'passed': 1, 'failed': 0, 'results': [{'status': 'passed', 'exitCode': 0}]}
PROJECT = {'name': 'modus-qa', 'production_branch': 'qa-production-disabled', 'source': None,
           'domains': ['modus-qa.pages.dev'], 'deployment_configs': {'preview': {}}}


class QATests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.source, self.payload = self.base / 'source', self.base / 'payload'
        (self.source / 'dist/en').mkdir(parents=True)
        (self.source / 'dist/index.html').write_text('Norwegian fixture')
        (self.source / 'dist/en/index.html').write_text('English fixture')
        (self.source / 'test-results').mkdir()
        self.report_file = self.source / 'test-results/test-results.json'
        self.report_file.write_text(json.dumps(REPORT))

    def bundle(self):
        package(self.source, self.payload, ENV)

    def test_approved_dispatch(self):
        self.assertEqual(dispatch(ENV), 'modus-qa')

    def test_dispatch_rejects_production_and_invalid_inputs(self):
        for change in [{'QA_PROJECT': 'modus'}, {'QA_PROJECT': 'other-qa'}, {'QA_ENABLED': ''},
                       {'GITHUB_REF': 'refs/heads/feature'}, {'GITHUB_EVENT_NAME': 'pull_request'},
                       {'GITHUB_REPOSITORY': 'attacker/modus'}, {'SOURCE_SHA': 'main'},
                       {'SOURCE_SHA': SHA + ';echo unsafe'}, {'QA_ACCOUNT_ID': '2' * 32},
                       {'QA_ACCOUNT_ID': ''}, {'PRODUCTION_ACCOUNT_ID': ''}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                dispatch({**ENV, **change})

    def test_failure_reports_rejected(self):
        for change in [{'failed': 1}, {'passed': 0}, {'total': 0, 'passed': 0, 'results': []},
                       {'results': [{'status': 'failed', 'exitCode': 1}]},
                       {'results': [{'status': 'passed', 'exitCode': 1}]}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                tests_passed({**REPORT, **change})

    def test_package_and_verify(self):
        (self.source / 'dist/.gitkeep').write_text('MODUS\n')
        self.bundle()
        verified = verify_payload(self.payload, SHA)
        self.assertEqual(verified['source_sha'], SHA)
        self.assertIn('qa-build.json', verified['files'])
        self.assertFalse((self.payload / 'site/.gitkeep').exists())

    def test_checksum_and_sha_mismatch(self):
        self.bundle()
        with self.assertRaises(ValueError): verify_payload(self.payload, 'c' * 40)
        (self.payload / 'site/index.html').write_text('tampered')
        with self.assertRaises(ValueError): verify_payload(self.payload, SHA)

    def test_unsafe_static_artifacts(self):
        for name in ['_worker.js', '_routes.json', 'wrangler.toml', 'functions/a.js', '.env']:
            with self.subTest(name=name):
                file = self.source / 'dist' / name
                file.parent.mkdir(exist_ok=True)
                file.write_text('unsafe')
                with self.assertRaises(ValueError): site_manifest(self.source / 'dist')
                file.unlink()
                if name.startswith('functions/'): file.parent.rmdir()

    def test_symlink_rejected(self):
        (self.source / 'dist/link.html').symlink_to(self.source / 'dist/index.html')
        with self.assertRaises(ValueError): site_manifest(self.source / 'dist')

    def test_failed_tests_cannot_be_packaged(self):
        self.report_file.write_text(json.dumps({**REPORT, 'failed': 1}))
        with self.assertRaises(ValueError): self.bundle()
        self.assertFalse(self.payload.exists())

    def test_project_isolation(self):
        validate_project(PROJECT, [PROJECT], 'qa-fixture')
        changes = [{'name': 'modus'}, {'production_branch': 'main'}, {'source': {'type': 'github'}},
                   {'domains': ['example.com']}, {'deployment_configs': {'preview': {'env_vars': {'SECRET': {}}}}}]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_project({**PROJECT, **change}, [PROJECT], 'qa-fixture')
        with self.assertRaises(ValueError): validate_project(PROJECT, [PROJECT, {'name': 'modus'}], 'qa-fixture')

    def fake_api(self, path):
        if path == '/modus-qa': return PROJECT
        if path.startswith('?'): return [PROJECT]
        return [{'id': 'fake-id', 'url': 'https://abc123.modus-qa.pages.dev', 'environment': 'preview',
                 'deployment_trigger': {'metadata': {'branch': 'qa-' + SHA[:12] + '-123-1', 'commit_hash': SHA}},
                 'latest_stage': {'name': 'deploy', 'status': 'success'}}]

    def test_deploy_offline_success_and_redaction(self):
        self.bundle()
        calls = []
        def fake_run(command, **kwargs):
            calls.append((command, kwargs))
            return SimpleNamespace(returncode=0, stdout=ENV['CLOUDFLARE_API_TOKEN'], stderr='')
        marker = {k: json.loads((self.payload / 'manifest.json').read_text())[k] for k in ('source_sha', 'workflow_sha', 'run_id', 'run_attempt')}
        out = self.base / 'deployment'
        result = deploy(self.payload, out, ENV, api=self.fake_api, run=fake_run, read_marker=lambda url: marker)
        self.assertEqual(result['status'], 'verified')
        self.assertEqual(len(calls), 1)
        self.assertIn('modus-qa', calls[0][0])
        self.assertNotIn('GITHUB_TOKEN', calls[0][1]['env'])
        self.assertNotIn(ENV['CLOUDFLARE_API_TOKEN'], (out / 'wrangler.log').read_text())

    def test_failed_artifact_prevents_api_and_deploy(self):
        self.bundle()
        (self.payload / 'test-results.json').write_text(json.dumps({**REPORT, 'failed': 1}))
        def forbidden(*args, **kwargs): self.fail('API/deploy must never run for failed test evidence')
        with self.assertRaises(ValueError): deploy(self.payload, self.base / 'blocked', ENV, api=forbidden, run=forbidden)
        self.assertEqual(json.loads((self.base / 'blocked/deployment.json').read_text())['status'], 'failed')

    def test_wrong_run_or_missing_token_prevents_deploy(self):
        self.bundle()
        for change in [{'GITHUB_RUN_ID': '124'}, {'CLOUDFLARE_API_TOKEN': ''}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                deploy(self.payload, self.base / 'blocked', {**ENV, **change}, api=lambda _: self.fail('API must not run'))

    def test_wrong_live_marker_is_failure(self):
        self.bundle()
        with self.assertRaises(ValueError):
            deploy(self.payload, self.base / 'wrong-live', ENV, api=self.fake_api,
                   run=lambda *a, **k: SimpleNamespace(returncode=0, stdout='', stderr=''), read_marker=lambda url: {})
        self.assertEqual(json.loads((self.base / 'wrong-live/deployment.json').read_text())['status'], 'failed')

    def test_unsafe_remote_project_prevents_upload(self):
        self.bundle()
        def unsafe_api(path):
            return {**PROJECT, 'production_branch': 'main'} if path == '/modus-qa' else [PROJECT]
        with self.assertRaises(ValueError):
            deploy(self.payload, self.base / 'unsafe-project', ENV, api=unsafe_api,
                   run=lambda *a, **k: self.fail('Unsafe project must not be uploaded'))

    def test_wrangler_failure_is_recorded(self):
        self.bundle()
        with self.assertRaises(ValueError):
            deploy(self.payload, self.base / 'tool-failure', ENV, api=self.fake_api,
                   run=lambda *a, **k: SimpleNamespace(returncode=1, stdout='', stderr='fixture failure'))
        self.assertEqual(json.loads((self.base / 'tool-failure/deployment.json').read_text())['status'], 'failed')

    def test_non_preview_deployment_is_not_accepted(self):
        self.bundle()
        def wrong_environment(path):
            data = self.fake_api(path)
            if '/deployments?' in path: data[0]['environment'] = 'production'
            return data
        with self.assertRaises(ValueError):
            deploy(self.payload, self.base / 'wrong-environment', ENV, api=wrong_environment,
                   run=lambda *a, **k: SimpleNamespace(returncode=0, stdout='', stderr=''))

    def test_api_timeout_is_recorded(self):
        self.bundle()
        def timeout_api(path): raise TimeoutError('offline fixture')
        with self.assertRaises(TimeoutError): deploy(self.payload, self.base / 'timeout', ENV, api=timeout_api)
        self.assertEqual(json.loads((self.base / 'timeout/deployment.json').read_text())['status'], 'failed')

    def test_missing_test_evidence_is_visible(self):
        summary = self.base / 'summary.md'
        evidence(self.base / 'evidence', {**ENV, 'GITHUB_STEP_SUMMARY': str(summary), 'BUILD_OUTCOME': 'failure', 'TEST_OUTCOME': 'skipped'})
        self.assertIn('not a passing QA run', summary.read_text())

    def test_workflow_structure_and_mutations(self):
        text = (ROOT / '.github/workflows/pl-081-qa-preview.yml').read_text()
        validate_workflow(text)
        for old, new in [("needs.build.result == 'success'", "always()"), ('environment: modus-qa', 'environment: production'),
                         ('contents: read', 'contents: write'), ('persist-credentials: false', 'persist-credentials: true'),
                         ('--ignore-scripts', ''), ('ref: ${{ github.workflow_sha }}', 'ref: ${{ inputs.source_sha }}')]:
            with self.subTest(old=old), self.assertRaises(ValueError): validate_workflow(text.replace(old, new, 1))
        with self.assertRaises(ValueError): validate_workflow(text + '\npermissions: {}\n')

    def test_locked_deployer(self):
        package_json = json.loads((ROOT / 'tools/qa/package.json').read_text())
        lock = json.loads((ROOT / 'tools/qa/package-lock.json').read_text())
        self.assertEqual(package_json['dependencies']['wrangler'], '4.151.3')
        self.assertEqual(lock['packages']['node_modules/wrangler']['version'], '4.151.3')


if __name__ == '__main__':
    unittest.main(verbosity=2)

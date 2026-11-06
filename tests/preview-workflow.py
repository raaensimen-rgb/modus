"""Offline regression tests: no credentials, deployment or external requests."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('workflow', Path(__file__).resolve().parents[1] / 'scripts/preview-workflow.py')
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)
SHA = 'a' * 40


class WorkflowTests(unittest.TestCase):
    def test_targets_separate_production_and_admin(self):
        for kind, url in [('admin','https://modus-4ye.pages.dev'),('admin','https://modus-2-preview.pages.dev'),('public','https://modus-2-preview.pages.dev'),('public','https://modus.no'),('public','http://modus-4ye.pages.dev'),('admin','https://dev-modus-2-pr52.modus-2-preview.pages.dev.evil.test')]:
            with self.subTest(url=url), self.assertRaises(ValueError): w.target(kind,url)
        self.assertEqual(w.target('public','https://modus-4ye.pages.dev'),'https://modus-4ye.pages.dev')
        self.assertEqual(w.target('admin','https://1234abcd.modus-2-preview.pages.dev'),'https://1234abcd.modus-2-preview.pages.dev')

    def test_admin_commit_branch_dirty_and_untracked_gate(self):
        for outputs in [[SHA, 'main', '', ''], [SHA, w.BRANCH, 'client/editor.js', ''], [SHA, w.BRANCH, '', 'private.txt'], ['b'*40, w.BRANCH, '', '']]:
            with patch.object(w, 'run', side_effect=outputs), self.assertRaises(ValueError): w.source_gate(Path('.'), SHA)
        with patch.object(w, 'run', side_effect=[SHA, w.BRANCH, '', '']): w.source_gate(Path('.'), SHA)

    def test_admin_requires_real_access_redirect_not_generic_403(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'admin-app.js').write_text('synthetic')
            m = dict(project=w.PROJECT, source_sha=SHA, tracked_source_dirty=False,
                     kind='modus-protected-admin-browser-only', planned_hostname=w.ADMIN,
                     backend='disabled', publishing='disabled', externalAI='disabled', crossDeviceSync=False, cmsSeedRecords=0,
                     files=[dict(path='admin-app.js', sha256=w.digest(b'synthetic'))])
            (root/'admin-package.json').write_text(json.dumps(m))
            with patch.object(w, 'request', return_value=(302, 'https://'+w.ACCESS+'/cdn-cgi/access/login/test', b'')):
                self.assertEqual(w.verify(root, 'admin', SHA, ['https://'+w.ADMIN])['checks'], 6)
            for response in [(403, '', b''), (200, '', b'private'), (302, 'https://attacker.test/cdn-cgi/access/login/test', b'')]:
                with patch.object(w, 'request', return_value=response), self.assertRaises(ValueError):
                    w.verify(root, 'admin', SHA, ['https://'+w.ADMIN])


if __name__ == '__main__': unittest.main()

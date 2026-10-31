"""Trusted static QA deployer. No source-code execution, no production target."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.request

from guard import dispatch, PRODUCTION_BRANCH, require, verify_payload


def validate_project(project, projects, branch):
    require(project.get('name') == 'modus-qa', 'Unexpected Pages project')
    require([p.get('name') for p in projects] == ['modus-qa'], 'QA account must contain only the approved Pages project')
    require(project.get('production_branch') == PRODUCTION_BRANCH, 'QA production branch must be disabled sentinel')
    require(branch != project['production_branch'] and branch.startswith('qa-'), 'Preview branch required')
    require(not project.get('source'), 'QA project must use Direct Upload without Git integration')
    require(all(d == 'modus-qa.pages.dev' for d in project.get('domains', [])), 'Custom domains are forbidden on QA project')
    preview = project.get('deployment_configs', {}).get('preview', {})
    for key in ('env_vars', 'kv_namespaces', 'd1_databases', 'r2_buckets', 'services', 'ai', 'durable_object_namespaces', 'hyperdrive_bindings', 'vectorize_bindings', 'queues'):
        require(not preview.get(key), 'QA runtime variables/bindings are forbidden: ' + key)


def deploy(payload, destination, env, api=None, run=subprocess.run, pause=time.sleep, read_marker=None):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    record = {'source_sha': env.get('SOURCE_SHA'), 'workflow_sha': env.get('GITHUB_WORKFLOW_SHA'),
              'run_id': env.get('GITHUB_RUN_ID'), 'run_attempt': env.get('GITHUB_RUN_ATTEMPT'),
              'project': env.get('QA_PROJECT'), 'status': 'blocked', 'deployment_id': None, 'url': None}
    token = env.get('CLOUDFLARE_API_TOKEN', '')
    try:
        project_name = dispatch(env)
        manifest = verify_payload(payload, env['SOURCE_SHA'])
        report = json.loads((Path(payload) / 'test-results.json').read_text())
        record['tests'] = {key: report[key] for key in ('total', 'passed', 'failed')}
        for key, name in [('workflow_sha', 'GITHUB_WORKFLOW_SHA'), ('run_id', 'GITHUB_RUN_ID'), ('run_attempt', 'GITHUB_RUN_ATTEMPT')]:
            require(manifest.get(key) == env.get(name) and bool(env.get(name)), 'Artifact execution identity mismatch: ' + key)
        require(token, 'Missing environment secret CF_QA_API_TOKEN')
        require(re.fullmatch('[0-9]{1,20}', env['GITHUB_RUN_ID']) and re.fullmatch('[0-9]{1,4}', env['GITHUB_RUN_ATTEMPT']), 'Invalid run identity')
        branch = f"qa-{env['SOURCE_SHA'][:12]}-{env['GITHUB_RUN_ID']}-{env['GITHUB_RUN_ATTEMPT']}"
        record['branch'] = branch
        base = f"https://api.cloudflare.com/client/v4/accounts/{env['QA_ACCOUNT_ID']}/pages/projects"

        def live_api(path):
            request = urllib.request.Request(base + path, headers={'Authorization': 'Bearer ' + token})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.load(response)
            require(data.get('success') is True, 'Cloudflare metadata request failed')
            return data['result']

        api = api or live_api
        project = api('/' + project_name)
        projects = []
        for page in range(1, 21):
            batch = api(f'?page={page}&per_page=50')
            require(isinstance(batch, list), 'Invalid account project list')
            projects.extend(batch)
            if len(batch) < 50:
                break
        else:
            raise ValueError('Cannot establish complete QA account project list')
        validate_project(project, projects, branch)
        record['status'] = 'upload_started'
        wrangler = Path(__file__).resolve().parents[2] / 'tools/qa/node_modules/wrangler/bin/wrangler.js'
        # No checkout cwd, inherited Wrangler config, shell, or source lifecycle scripts.
        clean_env = {k: env[k] for k in ('PATH', 'HOME', 'NODE_EXTRA_CA_CERTS') if k in env}
        clean_env.update(CLOUDFLARE_API_TOKEN=token, CLOUDFLARE_ACCOUNT_ID=env['QA_ACCOUNT_ID'], CI='true', WRANGLER_SEND_METRICS='false')
        with tempfile.TemporaryDirectory(prefix='modus-qa-deploy-') as cwd:
            result = run(['node', str(wrangler), 'pages', 'deploy', str((Path(payload) / 'site').resolve()),
                          '--project-name', project_name, '--branch', branch,
                          '--commit-hash', env['SOURCE_SHA'], '--commit-dirty=false'],
                         cwd=cwd, env=clean_env, capture_output=True, text=True, timeout=600, check=False)
        log = (result.stdout or '') + '\n' + (result.stderr or '')
        (destination / 'wrangler.log').write_text(log.replace(token, '[REDACTED]'))
        require(result.returncode == 0, 'Wrangler failed; review sanitized deployment log')
        # Read actual deployment metadata instead of inferring an ID from CLI text.
        for _ in range(12):
            deployments = api('/' + project_name + '/deployments?env=preview&page=1&per_page=25')
            matches = [d for d in deployments if d.get('deployment_trigger', {}).get('metadata', {}).get('branch') == branch
                       and d.get('deployment_trigger', {}).get('metadata', {}).get('commit_hash') == env['SOURCE_SHA']]
            require(len(matches) <= 1, 'Ambiguous deployment identity')
            if matches:
                item = matches[0]
                record['deployment_id'], record['url'] = item.get('id'), item.get('url')
                require(item.get('environment') == 'preview', 'Non-preview deployment detected')
                record['environment'] = item['environment']
                if item.get('latest_stage', {}).get('status') == 'failure':
                    raise ValueError('Cloudflare deployment failed')
                if item.get('latest_stage', {}).get('name') == 'deploy' and item.get('latest_stage', {}).get('status') == 'success':
                    require(record['deployment_id'] and re.fullmatch(r'https://[a-z0-9]+\.modus-qa\.pages\.dev', record['url'] or ''), 'Immutable QA deployment URL/ID missing')
                    break
            pause(2)
        else:
            raise ValueError('Deployment verification timed out; inspect account before retrying')
        if read_marker is None:
            def read_marker(url):
                with urllib.request.urlopen(url + '/qa-build.json', timeout=30) as response:
                    require(response.geturl() == url + '/qa-build.json', 'Build marker redirected')
                    return json.load(response)
        marker = read_marker(record['url'])
        require(marker == {k: manifest[k] for k in ('source_sha', 'workflow_sha', 'run_id', 'run_attempt')}, 'Live build marker mismatch')
        record['status'] = 'verified'
        return record
    except Exception:
        record['status'] = 'failed'
        record['error'] = 'QA deployment blocked or not verified; inspect workflow stage and sanitized log. Do not retry blindly.'
        raise
    finally:
        (destination / 'deployment.json').write_text(json.dumps(record, indent=2) + '\n')
        if env.get('GITHUB_STEP_SUMMARY'):
            with open(env['GITHUB_STEP_SUMMARY'], 'a') as stream:
                stream.write(f"\n## QA deployment\n\nStatus: {record['status']}\n\nSource: `{record['source_sha']}`\n\nProject: {record['project']}\n\nDeployment: {record['deployment_id']}\n\nURL: {record['url']}\n")


if __name__ == '__main__':
    try:
        deploy(sys.argv[1], sys.argv[2], os.environ)
    except Exception:
        print('QA deployment was blocked or could not be verified. See deployment.json and sanitized log.', file=sys.stderr)
        sys.exit(1)

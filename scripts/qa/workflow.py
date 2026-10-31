"""Parse YAML and enforce the deployment boundary; no credentials required."""
import re
import yaml
from guard import require


class UniqueLoader(yaml.BaseLoader):
    pass


def mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        require(key not in result, 'Duplicate YAML key: ' + str(key))
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)


def validate_workflow(text):
    data = yaml.load(text, Loader=UniqueLoader)
    require(set(data['on']) == {'workflow_dispatch'}, 'Only manual dispatch is allowed')
    inputs = data['on']['workflow_dispatch']['inputs']
    require(set(inputs) == {'source_sha'}, 'Only source SHA may be a workflow input')
    require(inputs['source_sha']['required'] == 'true' and inputs['source_sha']['type'] == 'string', 'Required source SHA input missing')
    require(data['permissions'] == {'contents': 'read'}, 'Only read-only repository permissions allowed')
    require(data['concurrency']['cancel-in-progress'] == 'false', 'Do not interrupt deployment by starting another run')
    jobs = data['jobs']
    require(set(jobs) == {'preflight', 'build', 'deploy'}, 'Unexpected QA job structure')
    require(jobs['preflight']['if'] == "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'", 'Preflight main/manual gate required')
    require(jobs['build']['needs'] == 'preflight', 'Build must depend on preflight')
    deploy = jobs['deploy']
    require(set(deploy['needs']) == {'preflight', 'build'}, 'Deployment must depend on build and preflight')
    require(deploy['if'] == "needs.preflight.result == 'success' && needs.build.result == 'success' && github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'", 'Deployment failure gate changed')
    require(deploy['environment'] == 'modus-qa', 'Protected QA environment required')
    require(data['env']['QA_PROJECT'] == '${{ vars.MODUS_QA_PROJECT }}', 'Project must come from reviewed repository configuration')
    secret_steps = []
    for name, job in jobs.items():
        require(job['runs-on'] == 'ubuntu-24.04', 'Runner image family must be pinned')
        require(0 < int(job['timeout-minutes']) <= 20, 'Bounded job timeout required')
        require('continue-on-error' not in job, 'Job failures may not be ignored')
        for step in job['steps']:
            require('continue-on-error' not in step, 'Step failures may not be ignored')
            if 'uses' in step:
                require(re.fullmatch(r'actions/[a-z-]+@[0-9a-f]{40}', step['uses']), 'Actions must be pinned by commit')
                if step['uses'].startswith('actions/checkout@'):
                    require(step['with']['persist-credentials'] == 'false', 'Checkout credentials may not persist')
                    expected = '${{ inputs.source_sha }}' if step['with'].get('path') == 'source' else '${{ github.workflow_sha }}'
                    require(step['with']['ref'] == expected, 'Source/control checkout trust boundary changed')
                    require(name != 'deploy' or step['with'].get('path') == 'control', 'No tested-source checkout in secret job')
                if step['uses'].startswith('actions/setup-node@'):
                    require(step['with']['node-version'] == '22.22.0', 'Node version must be exact')
                if step['uses'].startswith('actions/setup-python@'):
                    require(step['with']['python-version'] == '3.12.14', 'Python version must be exact')
            run = step.get('run', '')
            require('${{' not in run, 'Expressions must be passed through env/with, not interpolated shell')
            require('secrets.' not in str(job.get('env', {})), 'No job-wide deployment secrets')
            if 'secrets.' in str(step):
                secret_steps.append((name, step))
    require('secrets.' not in str(data.get('env', {})), 'No workflow-wide deployment secrets')
    require(len(secret_steps) == 1, 'Only one credential-bearing step allowed')
    job_name, secret_step = secret_steps[0]
    require(job_name == 'deploy' and secret_step.get('id') == 'deploy', 'Only trusted deploy step receives credentials')
    require(secret_step['env'] == {'CLOUDFLARE_API_TOKEN': '${{ secrets.CF_QA_API_TOKEN }}'}, 'Only dedicated QA token allowed')
    require(secret_step['run'] == 'python control/scripts/qa/deploy.py "$RUNNER_TEMP/qa-payload" "$RUNNER_TEMP/qa-deployment"', 'Unexpected credential-bearing command')
    build = jobs['build']['steps']
    runs = [step.get('run') for step in build]
    require(runs.index('npm run build') < runs.index('npm test') < runs.index('python control/scripts/qa/guard.py package source "$RUNNER_TEMP/qa-payload"'), 'Build/test/package order required')
    require(all('if' not in step for step in build if step.get('run') in {'npm run build', 'npm test', 'python control/scripts/qa/guard.py package source "$RUNNER_TEMP/qa-payload"'}), 'Build/test/package must use default success gating')
    require('npm ci --prefix control/tools/qa --ignore-scripts' in [s.get('run') for s in deploy['steps']], 'Locked tool installation without lifecycle scripts required')
    return data

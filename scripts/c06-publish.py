"""C06 only: future explicitly approved upload followed by mandatory public QA.
Preparing or testing PL-AUTO-001 never invokes this command. It requires a separate
owner GO for the exact source/ZIP and an explicit source confirmation by C06.
"""
import argparse
import os
from pathlib import Path
import shutil
import sys
import production_workflow as w


def publish(candidate, approval, confirmed_sha, out, wrangler_js=None):
    c=w.config()
    r,_=w.candidate(w.ROOT,candidate,c)
    if confirmed_sha!=r['source_sha']:
        raise ValueError('C06 must explicitly confirm the separately owner-approved source SHA')
    plan=w.preflight(w.ROOT,candidate,approval,c)
    w.write(out/'preflight.json',plan)
    if wrangler_js:
        wrangler_js=wrangler_js.resolve()
        # Reuse an installed Wrangler, never npx-install a tool during release.
        package=w.read(wrangler_js.parent.parent/'package.json')
        if not wrangler_js.is_file() or package.get('name')!='wrangler':
            raise ValueError('Use the installed wrangler/bin/wrangler.js entry point')
        executable=['node',str(wrangler_js)]
    else:
        binary=shutil.which('wrangler')
        if not binary: raise ValueError('Installed Wrangler required; pass --wrangler-js from the existing C06 installation')
        executable=[binary]
    result={'status':'PUBLICATION_NOT_VERIFIED','source_sha':confirmed_sha,'deployed':False,'upload_attempted':False}
    try:
        # Recheck every sealed candidate byte immediately before upload.
        w.candidate(w.ROOT,candidate,c)
        command=executable+plan['command'][1:]
        result['upload_attempted']=True
        env={k:v for k,v in os.environ.items() if not k.startswith(('MODUS_','CF_PAGES_','CONTEXT'))}
        env['CLOUDFLARE_ACCOUNT_ID']=c['account_id']
        w.run_stage(w.ROOT,command,out/'upload.log',env)
        result['deployed']=True
        project=w.cloud_project(c)
        deployment=project['canonical_deployment']['id']
        if deployment==c['deployment_id']: raise ValueError('Canonical deployment did not advance after upload')
        result['deployment']=deployment
        result.update(w.verify(w.ROOT,candidate,deployment,out,c))
        result['deployed']=True
        result['upload_attempted']=True
        # Hand C07 the next exact baseline; never rewrite the reviewed source in place.
        published=out/('public-package-'+confirmed_sha[:7])
        shutil.copytree(candidate/'package',published)
        next_baseline={**c,'source_sha':confirmed_sha,'deployment_id':deployment,
                       'package':'release-inputs/production-'+confirmed_sha[:7],
                       'files':w.inventory(published)}
        next_baseline.pop('retired_redirects',None)  # derived from the pinned _redirects on read
        w.write(out/'NEXT-BASELINE.json',next_baseline)
        result['next_baseline']=str(out/'NEXT-BASELINE.json')
        result['public_package']=str(published)
    except Exception as error:
        # An upload error is never reported as proof that production stayed unchanged.
        result.update(status='PUBLICATION_NOT_VERIFIED',error=str(error))
    w.write(out/'publication.json',result)
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--candidate',required=True,type=Path)
    p.add_argument('--approval',required=True,type=Path)
    p.add_argument('--owner-go-source',required=True)
    p.add_argument('--wrangler-js',type=Path)
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args();out=a.out.resolve()
    if out.exists() or out==w.ROOT or w.ROOT in out.parents: p.error('Choose a new delivery directory outside source')
    out.mkdir(parents=True)
    try: r=publish(a.candidate.resolve(),a.approval.resolve(),a.owner_go_source,out,a.wrangler_js)
    except Exception as error:
        r={'status':'BLOCKED_BEFORE_UPLOAD','error':str(error),'deployed':False,'upload_attempted':False}
        w.write(out/'publication.json',r)
    print(r)
    return 0 if r['status']=='PUBLIC_VERIFIED' else 2


if __name__=='__main__':sys.exit(main())

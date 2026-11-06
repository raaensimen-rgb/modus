'use strict';
// Serve only the audited public candidate on loopback; never source or raw dist.
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../../package'),manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json')));
if(manifest.kind!=='modus-package-a-local'||manifest.deploy_authorized!==false)throw Error('Build the local package-A candidate first');
require('../tests/public-package-server.cjs').startPublicPackageServer(root).then(server=>{
 console.log('Local MODUS candidate: '+server.origin);
 console.log('Only the public candidate is served. Stop with Ctrl+C.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.stop();process.exit(0);});
}).catch(error=>{console.error(error);process.exitCode=1;});

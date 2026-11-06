'use strict';
const path=require('node:path'),fs=require('node:fs');const root=path.resolve(__dirname,'../../package');if(JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'))).kind!=='ux-001-start-here-local')throw Error('Build UX-001 first');
require('../tests/public-package-server.cjs').startPublicPackageServer(root).then(s=>{console.log('UX-001 local preview: '+s.origin);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await s.stop();process.exit(0)});});

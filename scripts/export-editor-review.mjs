// Explicit private local export. Never called by npm run build.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {registryBundle} from '../cms/review-model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths={review:'editorial/article-publication-review.json',publication:'content/publication.json',illustrations:'content/article-illustration-permissions.json',cards:'content/article-card-permissions.json'};
const registries=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))]));
// The local file contains review metadata, never article bodies or Auth config.
const bundle=registryBundle({schema_version:1,kind:'modus-private-review-context',registries,source_hashes:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]))});
fs.mkdirSync(path.join(root,'.build-private'),{recursive:true});
const target=path.join(root,'.build-private','editor-review-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
fs.writeFileSync(target,JSON.stringify(bundle,null,2)+'\n',{flag:'wx',mode:0o600});console.log('Private local registry copy (not a build input): '+target);

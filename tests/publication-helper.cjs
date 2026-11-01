'use strict';
const {execFileSync}=require('node:child_process');
module.exports=locale=>JSON.parse(execFileSync('python3',['-c',
 "import sys,json;sys.path.insert(0,'scripts');from publication import public_articles,public_catalog;print(json.dumps([a['slug'] for a in (public_catalog() if sys.argv[1]=='catalog' else public_articles(locale=sys.argv[1]))]))",locale||'nb'],{encoding:'utf8'}));

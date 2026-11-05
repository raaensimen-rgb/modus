'use strict';
// Shared loopback-only static server for the existing public artifact tests.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
exports.startPublicPackageServer=async function(directory){
 const root=path.resolve(directory),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
 const headers=fs.readFileSync(path.join(root,'_headers'),'utf8').split('\n').filter(l=>l.startsWith('  ')&&l.includes(':')).map(l=>{const i=l.indexOf(':');return [l.slice(0,i).trim(),l.slice(i+1).trim()];});
 const server=http.createServer((req,res)=>{for(const [key,value] of headers)res.setHeader(key,value);if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);return res.end();}if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}if(fs.existsSync(file+'.html'))file+='.html';else if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return {origin:'http://127.0.0.1:'+server.address().port,stop:()=>new Promise(resolve=>server.close(resolve))};
};

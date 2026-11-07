/* Loaded first, only in isolated artifacts. HTTP and meta CSP independently enforce the boundary. */
(()=>{'use strict';
const denied=()=>new DOMException('Backend calls are unavailable in this isolated test version.','SecurityError');
function allowed(url,method='GET'){
 try{
  const u=new URL(url,location.href),p=decodeURIComponent(u.pathname);
  return ['GET','HEAD'].includes(String(method).toUpperCase())&&['http:','https:'].includes(u.protocol)&&u.origin===location.origin&&!/^\/(?:en\/)?(?:api|auth|rest|rpc|cms|graphql|storage|functions)(?:\/|$)/i.test(p);
 }catch{return false;}
}
const originalFetch=window.fetch.bind(window);
Object.defineProperty(window,'fetch',{configurable:false,writable:false,value:(input,init)=>{
 try{const r=new Request(input,init);if(!allowed(r.url,r.method))return Promise.reject(denied());return originalFetch(r,{redirect:'error'});}catch(e){return Promise.reject(e);}
}});
const open=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url,...rest){if(!allowed(url,method))throw denied();return open.call(this,method,url,...rest);};
for(const name of ['WebSocket','EventSource'])Object.defineProperty(window,name,{configurable:false,writable:false,value:function(){throw denied();}});
Object.defineProperty(navigator,'sendBeacon',{configurable:false,writable:false,value:()=>false});
document.addEventListener('submit',e=>{if(e.target.method!=='dialog')e.preventDefault();},true);
for(const name of ['submit','requestSubmit']){const original=HTMLFormElement.prototype[name];Object.defineProperty(HTMLFormElement.prototype,name,{configurable:false,writable:false,value:function(...args){if(this.method==='dialog')return original.apply(this,args);throw denied();}});}
// Never consume an auth callback or display tokens accidentally pasted into the test URL.
const u=new URL(location.href);
for(const key of ['access_token','refresh_token','token_hash','code','provider_token','provider_refresh_token'])u.searchParams.delete(key);
if(/(?:^|[&#])(?:access_token|refresh_token|token_hash|provider_token)=/.test(u.hash))u.hash='';
if(u.href!==location.href)history.replaceState(null,'',u.href);
Object.defineProperty(window,'ModusPreview',{configurable:false,writable:false,value:Object.freeze({isolated:true,project:'modus-2-preview',ready:true})});
})();

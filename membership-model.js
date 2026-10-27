(function(){
  'use strict';
  const money = value => new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(value);
  function stripeUrl(value, portal=false){
    if(typeof value!=='string'||!value)return null;
    try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
      const host=portal?'billing.stripe.com':'buy.stripe.com';
      const path=portal?/^\/p\/login\/[a-zA-Z0-9_]+$/:/^\/[a-zA-Z0-9_]+$/;
      return u.hostname===host&&path.test(u.pathname)?u.href:null;
    }catch{return null;}
  }
  function localPage(value){return typeof value==='string'&&/^\/(?!\/)[a-zA-Z0-9_\-/.]+$/.test(value)&&!value.includes('..');}
  function checkout(config,id,period){
    if(!['plus','studio'].includes(id)||!['month','year'].includes(period))return null;
    const p=config?.plans?.[id];
    if(config?.salesOpen!==true||p?.contentReady!==true||p?.accessReady!==true)return null;
    if(!localPage(config.termsUrl)||!localPage(config.privacyUrl)||!stripeUrl(config.customerPortal,true)||!/^\S+@\S+\.\S+$/.test(config.supportEmail||''))return null;
    const url=stripeUrl(p.checkout?.[period]);
    // Test links must never appear as live purchase links.
    return url&&!new URL(url).pathname.startsWith('/test_')?url:null;
  }
  function quote(config,id,period){
    const p=config?.plans?.[id];if(!p||!['month','year'].includes(period))return null;
    const monthly=p.monthly,yearly=p.yearly;
    if(!Number.isInteger(monthly)||monthly<1||!Number.isInteger(yearly)||yearly<1)return null;
    return {name:p.name,amount:period==='year'?yearly:monthly,unit:period==='year'?'år':'måned',equivalent:yearly/12,saving:monthly*12-yearly};
  }
  window.ModusMemberships={money,stripeUrl,checkout,quote};
})();

(function(){
  'use strict';
  const config=window.MODUS_MEMBERSHIP_CONFIG,M=window.ModusMemberships,$=id=>document.getElementById(id);
  let period='month',selected=null,previousFocus;
  const dialog=$('membershipDialog');
  function render(){
    document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===period)));
    document.querySelectorAll('[data-plan]').forEach(card=>{
      const id=card.dataset.plan,q=M.quote(config,id,period);if(!q)return;
      card.querySelector('[data-amount]').textContent=M.money(q.amount);
      card.querySelector('[data-unit]').textContent='/ '+q.unit;
      card.querySelector('[data-cost-note]').textContent=period==='year'?`${M.money(q.equivalent)} NOK/month on average · Save ${M.money(q.saving)} kr per år.`:'Billed monthly when memberships open.';
      card.querySelector('[data-choose]').textContent=M.checkout(config,id,period)?'Choose '+q.name+' ↗':'View '+q.name+' →';
    });
    $('billingExplanation').textContent=period==='year'?'Annual billing: the full annual amount is paid at once. Equivalent to 10 monthly payments.':'Monthly billing: one payment each month.';
    const portal=M.stripeUrl(config.customerPortal,true);
    if(portal){$('customerPortal').href=portal;$('customerPortal').hidden=false;$('portalUnavailable').hidden=true;}
  }
  function show(id){
    selected=id;previousFocus=document.activeElement;const q=M.quote(config,id,period);if(!q)return;
    $('chosenName').textContent=q.name;
    $('chosenPrice').textContent=M.money(q.amount)+' NOK / '+q.unit;
    $('chosenPeriod').textContent=period==='year'?'Annual subscription · the full annual amount is paid at once.':'Monthly subscription · billed each month.';
    const url=M.checkout(config,id,period),link=$('checkoutLink');
    link.hidden=!url;if(url)link.href=url;else link.removeAttribute('href');
    $('checkoutUnavailable').hidden=Boolean(url);
    $('chosenRenewal').textContent=url?'The subscription renews automatically at the same price per period. You can cancel future renewals in the customer portal. Read the terms before purchase.':'This is a preview. No payment or subscription is created here.';
    $('chosenTerms').hidden=!url;
    if(url){$('membershipTerms').href=config.termsUrl;$('membershipPrivacy').href=config.privacyUrl;}
    dialog.showModal();$('closeMembership').focus();
  }
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;render();});
  document.querySelectorAll('[data-choose]').forEach(b=>b.onclick=()=>show(b.closest('[data-plan]').dataset.plan));
  $('closeMembership').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{selected=null;previousFocus?.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  render();
})();

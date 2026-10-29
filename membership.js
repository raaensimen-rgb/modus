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
      card.querySelector('[data-cost-note]').textContent=period==='year'?`${M.money(q.equivalent)} kr/mnd i snitt · Spar ${M.money(q.saving)} kr per år.`:'Faktureres månedlig når medlemskapet åpner.';
      card.querySelector('[data-choose]').textContent=M.checkout(config,id,period)?'Velg '+q.name+' ↗':'Se '+q.name+' →';
    });
    $('billingExplanation').textContent=period==='year'?'Årsbetaling: hele årsbeløpet betales samlet. Tilsvarer 10 månedsbetalinger.':'Månedsbetaling: én betaling per måned.';
    const portal=M.stripeUrl(config.customerPortal,true);
    if(portal){$('customerPortal').href=portal;$('customerPortal').hidden=false;$('portalUnavailable').hidden=true;}
  }
  function show(id){
    selected=id;previousFocus=document.activeElement;const q=M.quote(config,id,period);if(!q)return;
    $('studentVerification').hidden=id!=='elev';
    $('chosenName').textContent=q.name;
    $('chosenPrice').textContent=M.money(q.amount)+' kr / '+q.unit;
    $('chosenPeriod').textContent=period==='year'?'Årsabonnement · hele årsbeløpet betales samlet.':'Månedsabonnement · faktureres hver måned.';
    const url=M.checkout(config,id,period),link=$('checkoutLink');
    link.hidden=!url;if(url)link.href=url;else link.removeAttribute('href');
    $('checkoutUnavailable').hidden=Boolean(url);
    $('chosenRenewal').textContent=url?'Abonnementet fornyes automatisk til samme pris per periode. Du kan si opp videre fornyelse i kundeportalen. Se vilkårene før kjøp.':'Dette er en forhåndsvisning. Ingen betaling eller abonnement opprettes her.';
    $('chosenTerms').hidden=!url;
    if(url){$('membershipTerms').href=config.termsUrl;$('membershipPrivacy').href=config.privacyUrl;}
    dialog.showModal();$('closeMembership').focus();
  }
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;render();});
  document.querySelectorAll('[data-choose]').forEach(b=>b.onclick=()=>show(b.closest('[data-plan]').dataset.plan));
  $('closeMembership').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{selected=null;const school=$('studentSchool');if(school)school.value='';const info=$('studentSchoolInfo');if(info)info.textContent='Eksempellisten er ikke komplett. Andre norske skoler skal kunne vurderes når ordningen åpner.';previousFocus?.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  const school=$('studentSchool'),schoolInfo=$('studentSchoolInfo');
  if(school&&schoolInfo){
    school.addEventListener('change',()=>{
      schoolInfo.textContent=!school.value
        ? 'Eksempellisten er ikke komplett. Andre norske skoler skal kunne vurderes når ordningen åpner.'
        : school.value==='other'||school.value==='missing'
          ? 'Skolen din kan vurderes selv om den ikke finnes i listen. En sikker bekreftelsesløsning er ennå ikke tilgjengelig.'
          : 'Valgt lærested: '+school.value+'. Dette er bare en forhåndsvisning og ikke en bekreftelse av studentstatus.';
    });
  }
  render();
})();

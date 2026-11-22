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
  function selectCard(id){
    document.querySelectorAll('.pricing-grid .price-card').forEach(card=>{
      const chosen=(card.dataset.plan||card.dataset.tier)===id;
      card.classList.toggle('is-selected',chosen);
    });
  }
  function show(id){
    selected=id;previousFocus=document.activeElement;const q=M.quote(config,id,period);if(!q)return;
    selectCard(id);
    $('studentVerification').hidden=id!=='elev';
    $('chosenName').textContent=q.name;
    $('chosenPrice').textContent=M.money(q.amount)+' NOK / '+q.unit;
    $('chosenPeriod').textContent=period==='year'?'Annual subscription · the full annual amount is paid at once.':'Monthly subscription · billed each month.';
    $('dvaleBillingClarification').textContent=period==='year'?'With annual billing, you keep your entire paid year. Dormancy stops the next annual renewal; returning during the paid period does not trigger a second annual charge.':'With monthly billing, dormancy stops the next monthly renewal; already paid access is preserved.';
    const url=M.checkout(config,id,period),link=$('checkoutLink');
    link.hidden=!url;if(url)link.href=url;else link.removeAttribute('href');
    $('checkoutUnavailable').hidden=Boolean(url);
    $('chosenRenewal').textContent=url?'Planlagt MODUS Dvale: Etter 30 dager uten aktivitet stopper videre fornyelse. Du kan si opp når som helst. Gjenaktivering etter utløp krever et nytt, godkjent kjøp. Reglene må være operative før betaling åpnes.':'This is a preview. No payment or subscription is created here.';
    $('chosenTerms').hidden=!url;
    if(url){$('membershipTerms').href=config.termsUrl;$('membershipPrivacy').href=config.privacyUrl;}
    dialog.showModal();$('closeMembership').focus();
  }
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;render();});
  document.querySelectorAll('[data-choose]').forEach(b=>b.onclick=()=>show(b.closest('[data-plan]').dataset.plan));
  document.querySelectorAll('.pricing-grid .price-card').forEach(card=>{
    card.addEventListener('click',event=>{
      if(event.target.closest('a,button')){selectCard(card.dataset.plan||card.dataset.tier);return;}
      const id=card.dataset.plan||card.dataset.tier;
      selectCard(id);
      if(card.dataset.plan)show(id);
    });
  });
  $('closeMembership').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{selected=null;const school=$('studentSchool');if(school)school.value='';const info=$('studentSchoolInfo');if(info)info.textContent='This is not a complete directory. Other Norwegian schools may qualify when the program opens.';previousFocus?.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  const studentInfo=$('studentInfoDialog'),studentInfoTrigger=$('studentInfoTrigger');
  $('closeStudentInfo').addEventListener('click',()=>studentInfo.close());
  studentInfoTrigger.addEventListener('click',()=>{
    studentInfo.showModal();
    $('closeStudentInfo').focus();
  });
  studentInfo.addEventListener('close',()=>studentInfoTrigger.focus());
  studentInfo.addEventListener('click',event=>{
    if(event.target!==studentInfo)return;
    const bounds=studentInfo.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)studentInfo.close();
  });
  const school=$('studentSchool'),schoolInfo=$('studentSchoolInfo');
  if(school&&schoolInfo){
    school.addEventListener('change',()=>{
      schoolInfo.textContent=!school.value
        ? 'This is not a complete directory. Other Norwegian schools may qualify when the program opens.'
        : school.value==='other'||school.value==='missing'
          ? 'Skolen din kan vurderes selv om den ikke finnes i listen. En sikker bekreftelsesløsning er ennå ikke tilgjengelig.'
          : 'Valgt lærested: '+school.value+'. Dette er bare en preview og ikke en bekreftelse av studentstatus.';
    });
  }
  selectCard('plus');
  render();
})();

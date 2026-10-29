const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{},URL,Intl};vm.createContext(box);
for(const file of ['membership-config.js','membership-model.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),box);
const M=box.window.ModusMemberships,C=box.window.MODUS_MEMBERSHIP_CONFIG;
assert.equal(M.quote(C,'elev','month').amount,39);assert.equal(M.quote(C,'elev','year').amount,390);assert.equal(M.quote(C,'elev','year').saving,78);
assert.equal(M.quote(C,'plus','month').amount,79);assert.equal(M.quote(C,'plus','year').amount,790);
assert.equal(M.quote(C,'studio','year').saving,258);
for(const id of ['elev','plus','studio'])for(const p of ['month','year'])assert.equal(M.checkout(C,id,p),null);
for(const u of ['javascript:alert(1)','http://buy.stripe.com/a','https://buy.stripe.com.evil.test/a','https://evil.test/a','https://x@buy.stripe.com/a','https://buy.stripe.com:444/a'])assert.equal(M.stripeUrl(u),null);
assert.equal(M.stripeUrl('https://billing.stripe.com/p/login/abc',true),'https://billing.stripe.com/p/login/abc');
assert.equal(M.stripeUrl('https://billing.stripe.com/p/session/abc',true),null);
// Fake URLs are isolated fixtures; never written into production configuration.
const fixture=JSON.parse(JSON.stringify(C));fixture.salesOpen=true;fixture.termsUrl='/vilkar';fixture.privacyUrl='/personvern';fixture.supportEmail='test@example.test';fixture.customerPortal='https://billing.stripe.com/p/login/fixture';
for(const id of ['elev','plus','studio']){fixture.plans[id].contentReady=true;fixture.plans[id].accessReady=true;if(id==='elev')fixture.plans[id].verificationReady=true;for(const p of ['month','year'])fixture.plans[id].checkout[p]='https://buy.stripe.com/fixture_'+id+'_'+p;}
for(const id of ['elev','plus','studio'])for(const p of ['month','year'])assert.equal(M.checkout(fixture,id,p),'https://buy.stripe.com/fixture_'+id+'_'+p);
fixture.plans.plus.checkout.month='https://buy.stripe.com/test_fixture';assert.equal(M.checkout(fixture,'plus','month'),null);
fixture.plans.studio.accessReady=false;assert.equal(M.checkout(fixture,'studio','year'),null);
fixture.termsUrl='//evil.test';assert.equal(M.checkout(fixture,'plus','year'),null);
assert.equal(M.checkout(fixture,'unknown','month'),null);
const membershipHTML=fs.readFileSync('dist/modus-plus.html','utf8');
const membershipCSS=fs.readFileSync('dist/membership.css','utf8');
assert.match(membershipHTML,/<h1>MODUS<span class="membership-plus-mark">\+<\/span><\/h1>/,'MODUS+ must be the main heading');
assert.match(membershipHTML,/<h2 class="membership-hero-subtitle">Mer rom for <em>musikken\.<\/em><\/h2>/,'The previous headline becomes the subtitle');
assert.match(membershipHTML, /<title>MODUS\+ · Medlemskap og priser<\/title>/,'Update page title');
assert.match(membershipCSS, /\.membership-hero \.membership-hero-subtitle/,'Subtitle needs an explicit smaller typographic style');

for(const plan of ['elev','plus','studio']){
 const opening=new RegExp('<article class="price-card[^"]*" data-plan="'+plan+'"[^>]*><span class="plan-coming-badge">Kommer</span>');
 assert.match(membershipHTML,opening,'Premium plan '+plan+' must clearly show coming-soon status');
}
assert.match(membershipHTML,/<article class="price-card free-card" data-tier="free">/,'Free plan stays available');
assert(membershipHTML.indexOf('data-plan="elev"')>membershipHTML.indexOf('Modus Fri'));
assert(membershipHTML.indexOf('data-plan="elev"')<membershipHTML.indexOf('data-plan="plus"'));
assert.match(membershipHTML,/Samme planlagte innhold som MODUS\+/,'Student tier must receive the full MODUS+ package');
assert.match(membershipHTML,/Studentpris krever bekreftet elev- eller studentstatus/,'Student discount requires student status');
assert.match(membershipHTML,/id="studentSchool"/,'School selection preview must exist');
const dialoguePosition=membershipHTML.indexOf('<dialog id="membershipDialog"');
const schoolPosition=membershipHTML.indexOf('id="studentSchool"');
assert(schoolPosition>dialoguePosition,'School selection should be inside the plan dialog');
assert.equal((membershipHTML.match(/id="studentVerification"/g)||[]).length,1);
assert.match(membershipHTML,/id="studentVerification"[^>]*hidden/,'Student verification should be hidden for other plans');
const membershipJS=fs.readFileSync('dist/membership.js','utf8');
assert.match(membershipJS,/studentVerification'\)\.hidden=id!=='elev'/,'Only Elev should show school choice');

assert.match(membershipHTML,/valget sendes ikke inn, lagres ikke/,'Preview must disclose that school selections are not collected');
const noVerification=JSON.parse(JSON.stringify(C));noVerification.salesOpen=true;noVerification.plans.elev.contentReady=true;noVerification.plans.elev.accessReady=true;
assert.equal(M.checkout(noVerification,'elev','month'),null,'Student checkout is blocked until verification integration is ready');
assert.match(membershipCSS,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'Four pricing cards should use four columns on wide screens');
assert.match(membershipCSS,/\.plan-coming-badge/,'Coming-soon badge must be styled');
assert.match(membershipHTML,/Se Modus\+ →/,'Premium tier preview remains accessible');
const ribbons=[...membershipHTML.matchAll(/<span class="plan-ribbon">([^<]+)<\/span>/g)].map(m=>m[1]);
assert.equal(ribbons.length,4,'All four tiers must have short ribbon labels');
assert(membershipHTML.includes('class="price-card is-selected" data-plan="plus"'),'Plus is highlighted by default');
assert(!membershipCSS.includes('.price-card.featured{'),'Only dynamically selected cards receive the bright gradient');
assert(membershipCSS.includes('.price-card.is-selected{'),'Selected-card gradient must exist');
assert(membershipJS.includes("selectCard(id);"),'Plan preview must update active card');
assert(membershipJS.includes("selectCard('plus');"),'Plus is the initial active card');
// Teachers and parents should see a separate, factual information dialog only from the Elev card.
const elevStart=membershipHTML.indexOf('<article class="price-card" data-plan="elev"');
const plusStart=membershipHTML.indexOf('data-plan="plus"');
const infoTriggerPosition=membershipHTML.indexOf('id="studentInfoTrigger"');
const infoDialogPosition=membershipHTML.indexOf('<dialog id="studentInfoDialog"');
assert(elevStart>=0 && infoTriggerPosition>elevStart && infoTriggerPosition<plusStart,'Information button must be within the Elev card');
assert(infoDialogPosition>membershipHTML.indexOf('</main>'),'Info dialog must not clutter the main pricing page');
assert.match(membershipHTML,/id="studentInfoDialog"[^>]*aria-labelledby="studentInfoTitle"/,'Information dialog has accessible title');
assert.match(membershipHTML,/id="closeStudentInfo"/,'Information dialog has a close button');
assert.match(membershipHTML,/Automatiske tester er ikke en uavhengig fagfellevurdering/,'Independent academic review is not implied');
assert.match(membershipHTML,/er ikke en akkreditert skole/,'MODUS must not imply accreditation');
assert.match(membershipJS,/studentInfo\.showModal\(\)/,'Info button opens its own modal');
assert.match(membershipJS,/studentInfoTrigger\.focus\(\)/,'Info dialog returns focus to the trigger');
// Prevent regression to unreadable microtype on the four-card pricing page.
assert.match(membershipCSS,/Readability pass: MODUS\+/,'Readable typography rules must be present');
assert.match(membershipCSS,/\.price-card ul\{font-size:14px/,'Membership benefits must be legible');
assert.match(membershipCSS,/\.price-card \.card-description\{font-size:15px/,'Plan descriptions must be legible');
assert.match(membershipCSS,/\.student-info-sections p\{font-size:15px/,'Parent and teacher information must be legible');
assert.match(membershipCSS,/\.membership-faq details p\{font-size:15px/,'FAQ answers must be legible');
assert.match(membershipCSS,/max-width:1399px/,'Four-card layout must adapt before text is cramped');
console.log('Passed: membership amounts, annual savings, four checkout routes, blocked unconfigured sales, test links and unsafe URLs.');

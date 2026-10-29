const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{},URL,Intl};vm.createContext(box);
for(const file of ['membership-config.js','membership-model.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),box);
const M=box.window.ModusMemberships,C=box.window.MODUS_MEMBERSHIP_CONFIG;
assert.equal(M.quote(C,'plus','month').amount,79);assert.equal(M.quote(C,'plus','year').amount,790);
assert.equal(M.quote(C,'studio','year').saving,258);
for(const id of ['plus','studio'])for(const p of ['month','year'])assert.equal(M.checkout(C,id,p),null);
for(const u of ['javascript:alert(1)','http://buy.stripe.com/a','https://buy.stripe.com.evil.test/a','https://evil.test/a','https://x@buy.stripe.com/a','https://buy.stripe.com:444/a'])assert.equal(M.stripeUrl(u),null);
assert.equal(M.stripeUrl('https://billing.stripe.com/p/login/abc',true),'https://billing.stripe.com/p/login/abc');
assert.equal(M.stripeUrl('https://billing.stripe.com/p/session/abc',true),null);
// Fake URLs are isolated fixtures; never written into production configuration.
const fixture=JSON.parse(JSON.stringify(C));fixture.salesOpen=true;fixture.termsUrl='/vilkar';fixture.privacyUrl='/personvern';fixture.supportEmail='test@example.test';fixture.customerPortal='https://billing.stripe.com/p/login/fixture';
for(const id of ['plus','studio']){fixture.plans[id].contentReady=true;fixture.plans[id].accessReady=true;for(const p of ['month','year'])fixture.plans[id].checkout[p]='https://buy.stripe.com/fixture_'+id+'_'+p;}
for(const id of ['plus','studio'])for(const p of ['month','year'])assert.equal(M.checkout(fixture,id,p),'https://buy.stripe.com/fixture_'+id+'_'+p);
fixture.plans.plus.checkout.month='https://buy.stripe.com/test_fixture';assert.equal(M.checkout(fixture,'plus','month'),null);
fixture.plans.studio.accessReady=false;assert.equal(M.checkout(fixture,'studio','year'),null);
fixture.termsUrl='//evil.test';assert.equal(M.checkout(fixture,'plus','year'),null);
assert.equal(M.checkout(fixture,'unknown','month'),null);
const membershipHTML=fs.readFileSync('dist/modus-plus.html','utf8');
const membershipCSS=fs.readFileSync('dist/membership.css','utf8');
for(const plan of ['plus','studio']){
 const opening=new RegExp('<article class="price-card[^"]*" data-plan="'+plan+'"><span class="plan-coming-badge">Kommer</span>');
 assert.match(membershipHTML,opening,'Premium plan '+plan+' must clearly show coming-soon status');
}
assert.match(membershipHTML,/<article class="price-card free-card">/,'Free plan stays available');
assert.match(membershipCSS,/\.plan-coming-badge/,'Coming-soon badge must be styled');
assert.match(membershipHTML,/Se Modus\+ →/,'Premium tier preview remains accessible');
console.log('Passed: membership amounts, annual savings, four checkout routes, blocked unconfigured sales, test links and unsafe URLs.');

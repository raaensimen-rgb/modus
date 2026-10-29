import assert from 'node:assert/strict';
import {configReady,handleStripeTestRequest} from '../cms/stripe-test.mjs';
const base={MODUS_STRIPE_TEST_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_dummy',STRIPE_PRICE_ID:'price_dummy',MODUS_PUBLIC_ORIGIN:'https://preview.example',SUPABASE_URL:'https://supabase.example',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'serveronly'};
assert.equal(configReady(base),true);
assert.equal(configReady({...base,STRIPE_SECRET_KEY:'sk_live_not_allowed'}),false);
assert.equal(configReady({...base,MODUS_STRIPE_TEST_ENABLED:'false'}),false);
assert.equal(configReady({...base,MODUS_PUBLIC_ORIGIN:'http://preview.example'}),false);
assert.equal(configReady({...base,SUPABASE_SERVICE_ROLE_KEY:''}),false);
const off=await handleStripeTestRequest(new Request('https://preview.example/api/stripe/test-checkout',{method:'POST'}),{...base,MODUS_STRIPE_TEST_ENABLED:'false'});
assert.equal(off.status,503);
const unauth=await handleStripeTestRequest(new Request('https://preview.example/api/stripe/test-checkout',{method:'POST'}),base);
assert.equal(unauth.status,501); // subscription checkout disabled pending post-period billing design
const portal=await handleStripeTestRequest(new Request('https://preview.example/api/stripe/test-portal',{method:'POST'}),base);
assert.equal(portal.status,401);
console.log('Stripe test-mode fail-closed and auth guards passed');

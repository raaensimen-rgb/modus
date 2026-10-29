/**
 * PL-055 Stripe test-mode server functions. Not mounted in the public worker.
 * Never send STRIPE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to the browser.
 * Uses Supabase JWT verification and a server-side customer mapping.
 */
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const parseJSON=async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error?.message||"Upstream request failed");return data;};
export function configReady(env){
 return env.MODUS_STRIPE_TEST_ENABLED==="true"&&
  env.STRIPE_SECRET_KEY?.startsWith("sk_test_")&&
  env.STRIPE_PRICE_ID?.startsWith("price_")&&
  /^https:\/\//.test(env.MODUS_PUBLIC_ORIGIN||"")&&
  Boolean(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY&&env.SUPABASE_SERVICE_ROLE_KEY);
}
async function stripe(env,path,params){
 const resp=await fetch("https://api.stripe.com/v1/"+path,{method:"POST",headers:{"authorization":"Bearer "+env.STRIPE_SECRET_KEY,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params)});
 return parseJSON(resp);
}
async function authenticate(request,env){
 const header=request.headers.get("authorization")||"";
 if(!header.startsWith("Bearer "))return null;
 const response=await fetch(env.SUPABASE_URL+"/auth/v1/user",{headers:{"apikey":env.SUPABASE_ANON_KEY,"authorization":header}});
 if(!response.ok)return null;
 const user=await response.json().catch(()=>null);
 return user?.id&&user?.email?user:null;
}
async function mapping(env,userId){
 const uri=env.SUPABASE_URL+"/rest/v1/stripe_customers?user_id=eq."+encodeURIComponent(userId)+"&select=stripe_customer_id&limit=1";
 const r=await fetch(uri,{headers:{"apikey":env.SUPABASE_SERVICE_ROLE_KEY,"authorization":"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY}});
 const d=await parseJSON(r);return d?.[0]?.stripe_customer_id||null;
}
async function getOrCreateCustomer(env,user){
 const existing=await mapping(env,user.id);if(existing)return existing;
 const newCustomer=await stripe(env,"customers",{"email":user.email,"metadata[modus_user_id]":user.id});
 const response=await fetch(env.SUPABASE_URL+"/rest/v1/stripe_customers",{method:"POST",headers:{"apikey":env.SUPABASE_SERVICE_ROLE_KEY,"authorization":"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"content-type":"application/json","prefer":"resolution=ignore-duplicates,return=representation"},body:JSON.stringify({user_id:user.id,stripe_customer_id:newCustomer.id})});
 await parseJSON(response);
 return await mapping(env,user.id)||newCustomer.id;
}
export async function handleStripeTestRequest(request,env){
 if(!configReady(env))return json({error:"Stripe test integration disabled"},503);
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 const route=new URL(request.url).pathname;
 if(route!=="/api/stripe/test-checkout"&&route!=="/api/stripe/test-portal")return json({error:"Not found"},404);
 const user=await authenticate(request,env);if(!user)return json({error:"Sign in required"},401);
 try{
  const customer=await getOrCreateCustomer(env,user);
  const origin=env.MODUS_PUBLIC_ORIGIN.replace(/\/$/,"");
  const session=route.endsWith("test-portal")
   ?await stripe(env,"billing_portal/sessions",{"customer":customer,"return_url":origin+"/min-side.html"})
   :await stripe(env,"checkout/sessions",{"mode":"subscription","customer":customer,"line_items[0][price]":env.STRIPE_PRICE_ID,"line_items[0][quantity]":"1","success_url":origin+"/modus-plus.html?checkout=success","cancel_url":origin+"/modus-plus.html?checkout=cancel"});
  if(!session.url?.startsWith("https://"))return json({error:"Invalid Stripe response"},502);
  return json({url:session.url});
 }catch(e){return json({error:"Stripe test request failed"},502);}
}

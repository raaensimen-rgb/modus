// Cloudflare Pages Function: administrator-only Cloudflare Web Analytics proxy.
// Configure MODUS_SUPABASE_URL, MODUS_SUPABASE_ANON_KEY, CF_ANALYTICS_TOKEN,
// CF_ANALYTICS_ACCOUNT_ID and CF_ANALYTICS_SITE_TAG in Pages environment variables.
export async function onRequestGet({request,env}) {
  const analyticsToken = env.CF_ANALYTICS_TOKEN || env['CF_ANALYTICS-TOKEN'];
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if (!env.MODUS_SUPABASE_URL || !env.MODUS_SUPABASE_ANON_KEY || !analyticsToken || !env.CF_ANALYTICS_ACCOUNT_ID || !env.CF_ANALYTICS_SITE_TAG) return json({error:'Statistikk er ikke konfigurert på serveren.'},503);
  const bearer=request.headers.get('authorization')||'';
  if(!/^Bearer [a-zA-Z0-9._~-]+$/.test(bearer)) return json({error:'Innlogging kreves.'},401);
  const authHeaders={apikey:env.MODUS_SUPABASE_ANON_KEY,authorization:bearer};
  try {
    const u=await fetch(env.MODUS_SUPABASE_URL+'/auth/v1/user',{headers:authHeaders,signal:AbortSignal.timeout(5000)});
    if(!u.ok)return json({error:'Ugyldig innlogging.'},401);
    const user=await u.json();if(!user.id)return json({error:'Ugyldig bruker.'},401);
    const role=await fetch(env.MODUS_SUPABASE_URL+'/rest/v1/cms_editors?select=user_id&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers:authHeaders,signal:AbortSignal.timeout(5000)});
    if(!role.ok)return json({error:'Kunne ikke kontrollere redaktørtilgang.'},502);
    const rows=await role.json();if(!Array.isArray(rows)||!rows.some(r=>r.user_id===user.id))return json({error:'Ingen redaktørtilgang.'},403);
    const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5,1)).toISOString();
    const query=`query($account: String!, $start: Time!, $end: Time!, $site: string!) {
      viewer { accounts(filter:{accountTag:$account}) {
        rumPageloadEventsAdaptiveGroups(limit:200,orderBy:[date_ASC],
          filter:{datetime_geq:$start,datetime_leq:$end,siteTag:$site}) {
          count dimensions { date } sum { visits }
        }
      }}
    }`;
    const cf=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{authorization:'Bearer '+analyticsToken,'content-type':'application/json'},body:JSON.stringify({query,variables:{account:env.CF_ANALYTICS_ACCOUNT_ID,start,end:now.toISOString(),site:env.CF_ANALYTICS_SITE_TAG}}),signal:AbortSignal.timeout(10000)});
    if(!cf.ok)return json({error:'Cloudflare Analytics svarte med HTTP '+cf.status},502);
    const result=await cf.json();
    if(result.errors?.length)return json({error:'Cloudflare API-feil: '+result.errors.map(e=>e.message).join('; ').slice(0,300)},502);
    const days=result.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
    if(!Array.isArray(days))return json({error:'Uventet svar fra Cloudflare.'},502);
    return json({days:days.map(d=>({date:d.dimensions?.date,views:Number(d.count||0),visits:Number(d.sum?.visits||0)})),updatedAt:now.toISOString(),note:'Visninger og besøk de siste seks kalendermånedene. Ingen historikk utover API-vinduet.'});
  } catch{return json({error:'Statistikk kunne ikke hentes akkurat nå.'},502);}
}

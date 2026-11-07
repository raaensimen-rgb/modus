"""Compare five cold paired lab combinations; never substitute best-run scores."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];T=R.parent;E=T/'evidence';D=T/'delivery'
before=json.loads((E/'performance-baseline/results.json').read_text());after=json.loads((E/'performance-candidate/results.json').read_text())
assert before['profile']==after['profile'] and before['chromium']==after['chromium']
assert before['samples']>=5 and after['samples']>=5
key=lambda r:(r['view'],r['locale'],r['route'])
a={key(r):r for r in after['summary']};rows=[]
for b in before['summary']:
 c=a[key(b)];bs=b['stats'];cs=c['stats'];reduction=100*(1-cs['imageTransferBytes']['median']/bs['imageTransferBytes']['median'])
 rows.append({'view':b['view'],'locale':b['locale'],'route':b['route'],'before':bs,'after':cs,'image_byte_reduction_percent':reduction,'lcp_change_percent':100*(cs['lcpMs']['median']/bs['lcpMs']['median']-1),'lcp_before_elements':b['lcpElements'],'lcp_after_elements':c['lcpElements'],'lcp_regression_beyond_observed_range':cs['lcpMs']['median']>bs['lcpMs']['max']+max(20,bs['lcpMs']['max']-bs['lcpMs']['min']),'cls_regression_beyond_observed_range':cs['cls']['median']>bs['cls']['max']+.001})
result={'chromium':after['chromium'],'profile':after['profile'],'samples_per_combination':5,'baseline_navigations':len(before['rows']),'candidate_navigations':len(after['rows']),'rows':rows,'mobile_image_goal_met':all(r['image_byte_reduction_percent']>=30 for r in rows if r['view']=='mobile'),'field_data':False,'no_film_fetched':not any(r['filmFetched'] for r in before['rows']+after['rows']),'page_errors':sum(len(r['errors']) for r in before['rows']+after['rows'])}
(D/'PERFORMANCE.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
lines=['A06 – før/etter (median av fem kalde lastinger per kombinasjon)','Chromium '+after['chromium'],'10 Mbit/s ned, 5 Mbit/s opp, 40 ms RTT, CPU x4; samme loopback-server og cacheprofil.','Mobil 375x812 DPR2; desktop 1440x1000 DPR1. Resource Timing-overføringsbytes.','Alle råmålinger, valgte kilder/naturlige størrelser, LCP-element, FCP, CLS og long-task-diagnostikk ligger i evidence/performance-*/results.json.','Ingen felt-INP eller standardisert Lighthouse-TBT påstås.','', 'Flate | Språk | Side | Bildedata MB før→etter | Reduksjon | LCP ms median [min,max] før→etter | CLS median før→etter']
for r in rows:
 b=r['before'];a=r['after'];fmt=lambda s:f"{s['median']:.0f} [{s['min']:.0f},{s['max']:.0f}]"
 lines.append(f"{r['view']} | {r['locale']} | {r['route']} | {b['imageTransferBytes']['median']/1e6:.3f}→{a['imageTransferBytes']['median']/1e6:.3f} | {r['image_byte_reduction_percent']:.1f}% | {fmt(b['lcpMs'])}→{fmt(a['lcpMs'])} | {b['cls']['median']:.5f}→{a['cls']['median']:.5f}")
lines+=['',f"Mobilmål >=30% nådd: {result['mobile_image_goal_met']}",f"Ingen film forespurt i labmålingene: {result['no_film_fetched']}",f"JavaScript-sidefeil: {result['page_errors']}",'Måling gjelder disse fire flatene og denne labprofilen; øvrige historiske ytelsesfunn er ikke automatisk lukket.']
(D/'PERFORMANCE.txt').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))

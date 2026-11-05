"""No repeat owner approval; retain exact-version and private-draft boundaries."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from publication import load_policy,is_public,article_permission,public_articles
p=load_policy();a=json.loads((ROOT/'content/articles.json').read_text())[0];r=p['articles'][a['slug']]
assert r['publication_decision']=='owner_authorized'
for state in ['draft','in_review','approved']:
 assert is_public({**r,'editorial_status':state})
for state in ['under_review','not_documented',None]:
 assert article_permission({**r,'source_control_status':state},a)
for field,value in [('visibility','private'),('publication_decision','awaiting_owner'),('approval_reference',None),('approved_locales',[]),('editorial_status','bad')]:
 assert not article_permission({**r,field:value},a),(field,value)
changed=copy.deepcopy(a);changed['intro']+=' UNAUTHORIZED_VERSION'
assert not article_permission(r,changed)
assert not article_permission(None,{**a,'slug':'not-selected-private-draft'})
assert len(public_articles())==52
print('Owner selection independent of academic status; exact-version, invalid-state, language and new-private-draft checks passed.')

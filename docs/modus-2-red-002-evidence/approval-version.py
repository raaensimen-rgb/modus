import sys,json,tempfile,copy
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts'))
from publication import article_text_version,article_permission
with tempfile.TemporaryDirectory(prefix='modus-red002-hash-') as t:
 r=Path(t);(r/'content/i18n').mkdir(parents=True);(r/'scripts').mkdir()
 (r/'content/article-quizzes.json').write_text(json.dumps({'synthetic':[{'question':'Synthetic','en':{'question':'Synthetic EN'}}]}))
 (r/'content/i18n/en.json').write_text('{}');(r/'content/i18n/dynamic.tsv').write_text('');(r/'scripts/build-languages.py').write_text('')
 a={'slug':'synthetic','title':'Synthetic','sections':[['H','<p>T</p>']],'learning':{'goals':['Goal']}}
 nb=article_text_version(a,'nb',r);en=article_text_version(a,'en',r)
 record={'editorial_status':'approved','visibility':'public','approved_locales':['nb'],'approval_reference':'Synthetic review','publication_evidence':{'nb':{'reference':'Synthetic decision','reviewed_version_sha256':nb}}}
 assert article_permission(record,a,'nb',r) and not article_permission(record,a,'en',r)
 b=copy.deepcopy(a);b['learning']['goals'].append('New');assert article_text_version(b,'nb',r)!=nb
 (r/'content/i18n/en.json').write_text('{"Synthetic":"Translation"}');assert article_text_version(a,'nb',r)==nb and article_text_version(a,'en',r)!=en
 (r/'content/article-quizzes.json').write_text('{"synthetic":[{"question":"Changed"}]}');assert not article_permission(record,a,'nb',r)
 print('RED2-V01 exact content approval accepted; EN denied without own proof')
 print('RED2-V02 learning metadata and quiz changes invalidate version; translation change invalidates EN only')

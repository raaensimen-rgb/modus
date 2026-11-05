"""Explicit complete article translations shared by reader and CMS generation."""
import copy,html,json,re

def override(article,root):
    path=root/'content/i18n/articles.en.json'
    if not path.is_file():return None
    data=json.loads(path.read_text()).get(article['slug'])
    if data is None:return None
    if data.get('slug')!=article['slug'] or len(data.get('sections',[]))!=len(article['sections']):
        raise ValueError('Incomplete or mismatched English article: '+article['slug'])
    return copy.deepcopy(data)

def apply_override(page,article,root):
    translated=override(article,root)
    if translated is None:return page
    # Full HTML sections first; never replace a complete lesson with a summary.
    for i,(old,new) in enumerate(zip(article['sections'],translated['sections']),1):
        pattern=r'<section id="del-'+str(i)+r'">[\s\S]*?</section>'
        replacement='<section id="del-'+str(i)+'"><h2>'+html.escape(new[0],quote=True)+'</h2>'+new[1]+'</section>'
        page,count=re.subn(pattern,lambda m:replacement,page,count=1)
        page=page.replace(html.escape(old[0],quote=True),html.escape(new[0],quote=True))
        if count!=1:raise ValueError('Missing original section during translation: '+article['slug'])
    pairs=[(article[k],translated[k]) for k in ['title','intro','topic','exercise','practice_label']]
    pairs += list(zip(article.get('practice_steps',[]),translated.get('practice_steps',[])))
    l=article.get('learning',{});t=translated.get('learning',{})
    pairs += list(zip(l.get('goals',[]),t.get('goals',[])))
    pairs += [(l.get('prerequisites',''),t.get('prerequisites',''))]
    pairs += [(a['label'],b['label']) for a,b in zip(l.get('links',[]),t.get('links',[]))]
    if article.get('next_step'):pairs.append((article['next_step']['reason'],translated['next_step']['reason']))
    for old,new in sorted(pairs,key=lambda p:len(p[0]),reverse=True):
        if old:page=page.replace(html.escape(old,quote=True),html.escape(new,quote=True))
    quizzes=json.loads((root/'content/article-quizzes.json').read_text())[article['slug']]
    # Quiz-only replacement avoids changing prose when answer words are short.
    start=page.index('<section id="quiz"');before,quiz=page[:start],page[start:]
    for q in quizzes:
        quiz=quiz.replace(html.escape(q['question'],quote=True),html.escape(q['en']['question'],quote=True))
        for old,new in [(q['question'],q['en']['question']),(q['explanation'],q['en']['explanation']),*zip(q['options'],q['en']['options'])]:
            quiz=quiz.replace('>'+html.escape(old,quote=True)+'<','>'+html.escape(new,quote=True)+'<')
    return before+quiz

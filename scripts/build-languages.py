"""Build the English static site from Norwegian sources and reviewed translations.
Run after article generation and shared navigation. No runtime translation service.
"""
from pathlib import Path
from html.parser import HTMLParser
import html, json, re, shutil
import xml.etree.ElementTree as ET
from article_localization import apply_override
from publication import public_illustrations, load_policy, is_public, public_articles, holding_page, EN_TRANSLATIONS, preview_illustrations
policy=load_policy()
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
EN=DIST/'en'
english_articles={a['slug'] for a in public_articles(ROOT,'en')}
english_card_images=preview_illustrations(ROOT,'en')
translations=json.loads((ROOT/'content/i18n/en.json').read_text())
translations.update(EN_TRANSLATIONS)
translations.update({'Skalabibliotek':'Scale library','Utforsk skalaer og intervaller på en 24-bånds gitarhals.':'Explore scales and intervals on a 24-fret guitar neck.'})
for line in (ROOT/'content/i18n/dynamic.tsv').read_text().splitlines():
    if line:
        source, target=line.split('\t',1)
        translations[source]=target
long={k:v for k,v in translations.items() if k!=v and len(k)>=12}
long_re=re.compile('|'.join(re.escape(k) for k in sorted(long,key=len,reverse=True)))
short={k:v for k,v in translations.items() if k!=v and len(k)<12}
# Homepage copy is independent of the version-bound article translations.
# Never alter article provenance just to change the marketing homepage.
home_translations = {**translations, **json.loads((ROOT/'content/i18n/home.en.json').read_text())}
home_long = {k:v for k,v in home_translations.items() if k!=v and len(k)>=12}
home_re = re.compile('|'.join(re.escape(k) for k in sorted(home_long,key=len,reverse=True)))
def translate_home(s):
    stripped=s.strip()
    if stripped in home_translations:
        return s[:len(s)-len(s.lstrip())]+home_translations[stripped]+s[len(s.rstrip()):]
    return home_re.sub(lambda m:home_long[m[0]],s)
def translate(s):
    stripped=s.strip()
    if stripped in translations:
        return s[:len(s)-len(s.lstrip())]+translations[stripped]+s[len(s.rstrip()):]
    return long_re.sub(lambda m:long[m[0]],s)
def script(s):
    # Short terms only in whole string literals or whole HTML text nodes.
    # Longer, reviewed phrases include complete template fragments, preserving ${…}.
    patterns={}
    for k,v in short.items():
        for quote in ('"',"'"):
            patterns[quote+k+quote]=quote+v+quote
        patterns['>'+k+'<']='>'+v+'<'
    all_patterns={**long,**patterns}
    rx=re.compile('|'.join(re.escape(k) for k in sorted(all_patterns,key=len,reverse=True)))
    return rx.sub(lambda m:all_patterns[m[0]],s)
class EnglishHTML(HTMLParser):
    def __init__(self, translator=translate):
        super().__init__(convert_charrefs=True);self.out=[];self.skip=0;self.translate=translator
    def handle_starttag(self,tag,attrs):
        raw=self.get_starttag_text()
        for key,value in attrs:
            if value is None:continue
            target=value
            if key in ('title','aria-label','aria-description','placeholder','alt','content','data-search'):
                target=self.translate(value)
            if tag=='html' and key=='lang':target='en'
            if target!=value:
                raw=re.sub(r'(?<![\w-])'+re.escape(key)+r'=("[^"]*"|\x27[^\x27]*\x27)',lambda m:key+'="'+html.escape(target,quote=True)+'"',raw,count=1)
        self.out.append(raw)
        if tag in ('style','script'):self.skip+=1
    def handle_startendtag(self,t,a):self.handle_starttag(t,a)
    def handle_endtag(self,tag):
        self.out.append('</'+tag+'>')
        if tag in ('style','script'):self.skip-=1
    def handle_data(self,data):self.out.append(data if self.skip else html.escape(self.translate(data),quote=False))
    def handle_entityref(self,n):self.out.append('&'+n+';')
    def handle_charref(self,n):self.out.append('&#'+n+';')
    def handle_decl(self,d):self.out.append('<!'+d+'>')
    def handle_comment(self,d):self.out.append('<!--'+d+'-->')

def language_assets(page,prefix=''):
    if 'language-init.js' not in page:
        page=page.replace('<head>',f'<head><script src="{prefix}language-init.js"></script>',1)
    if 'language.js"' not in page:
        page=page.replace('</head>',f'<script src="{prefix}language.js" defer></script></head>',1)
    return page

# Atlas-only UI translations, without changing lesson manuscripts or other JS.
# Exact text replacements preserve stable module IDs, persistence keys and selectors.
ATLAS_EN = {
    "Mitt ": "My ", "musikkatlas.": "music atlas.",
    "MODUS / DIN LÆRINGSREISE": "MODUS / YOUR LEARNING JOURNEY",
    "Se hvordan alt henger sammen.": "See how everything connects.",
    "Et visuelt landskap over musikkens fagområder. Oppdag sammenhengene mellom det du kan, det du øver på, og det du vil lære videre.": "A visual overview of music subjects. Explore what you know, what you are practising and what you want to learn next.",
    "← Læringsstien": "← Learning path", "Se læreplanen ↗": "Explore the curriculum ↗",
    "HVA ER MITT MUSIKKATLAS?": "WHAT IS MY MUSIC ATLAS?",
    "Et kart som vokser med deg.": "A map that grows with you.",
    "Musikkatlaset samler teori, gehør, rytme, improvisasjon og komposisjon i ett bilde. Hvert fagområde har sine egne grener, slik at du kan se både helheten og hva som hører sammen. Kartet gir deg en personlig oversikt over læringsreisen din – og en idé om hva du kan utforske videre.": "The atlas brings theory, ear training, rhythm, improvisation and composition into one map. Each subject has its own branches, helping you understand the whole picture and plan what to explore next.",
    "01 / UTFORSK": "01 / EXPLORE", "Se hele landskapet": "Explore the map",
    "Alle hovedområder og moduler vises samtidig. Finn temaene du kjenner igjen, og se hva som ligger foran deg.": "All subjects and modules are visible together. Find familiar topics and discover what comes next.",
    "02 / MARKER": "02 / MARK", "Følg ditt eget arbeid": "Track your learning",
    "Atlaset følger artiklene du åpner og quizene du fullfører. Du kan fortsatt endre status manuelt. Grenene blir gradvis lysere.": "The atlas can reflect articles you open and quizzes you complete. You can also set your status manually.",
    "03 / BYGG VIDERE": "03 / BUILD ON IT", "Se neste mulighet": "Find your next step",
    "Legg inn egne notater og forslag til kurs. Slik kan atlaset inspirere både øvingen din og fremtidig undervisning.": "Add notes and course ideas to guide your future practice and learning.",
    "Atlaset kobler åpnete artikler og beståtte quizer til relevante emner. En åpnet artikkel betyr «Under arbeid»; når alle tilknyttede quizer er bestått, markeres emnet som lært i kartet. Dette er læringsprogresjon, ikke en faglig godkjenning. Egne markeringer og notater lagres lokalt i denne nettleseren og kan eksporteres. Fullførte quizer kan også være knyttet til kontoen din.": "The map links opened articles and passed quizzes to related topics. An opened article means in progress; completed linked quizzes may mark a topic as learned. This tracks learning activity, not formal approval. Your own notes and marks are stored in this browser and can be exported.",
    "UTFORSK / MARKER / PLANLEGG": "EXPLORE / MARK / PLAN",
    "Det musikalske landskapet": "The musical landscape",
    "Trykk på en gren eller modul. Statusen følger artikkelarbeidet ditt der det finnes tilknyttet innhold; du kan også overstyre den selv. Beståtte quizer gir progresjon, ikke formell godkjenning.": "Select a branch or module. You can set your own status, while linked article and quiz activity may also inform progress. Passing a quiz is not formal approval.",
    "Søk i kartet": "Search the map", "Søk etter f.eks. moduser": "Search for modes, intervals…",
    "Vis hele kartet": "Show entire map", "MODUS / FAGKART": "MODUS / SUBJECT MAP",
    "10 fagområder · 24 moduler": "10 subjects · 24 modules",
    "Tankekart over musikkteori. Kartet kan rulles både vannrett og loddrett.": "Music theory map. Scroll horizontally or vertically to explore.",
    "Interaktivt musikalsk tankekart med fagområder og moduler": "Interactive music atlas with subjects and modules",
    "Ikke gjennomgått": "Not yet studied", "Under arbeid": "In progress",
    "Lært / fullførte quizer": "Learned / completed quizzes",
    "Faglig godkjenning føres separat": "Editorial approval is tracked separately",
    "DETALJER / MITT KART": "DETAILS / MY MAP", "Velg et område": "Choose a subject",
    "Velg en gren eller modul for å se læringsprogresjonen fra artikler og quizer, eller for å angi status selv.": "Choose a branch or module to review progress or set your own learning status.",
    "Min egen læringsstatus": "My learning status",
    "Egenvurdert læringsstatus": "Self-assessed learning status",
    "Jeg har lært dette": "I have learned this",
    "Markeringen er din egen vurdering, ikke en attestert eller dokumentert mestring.": "Your mark is a personal assessment, not verified mastery.",
    "Merk som mulig kurs vi bør lage": "Mark as a possible future course",
    "Mitt notat": "My notes", "Hva kan jeg? Hva bør jeg lære videre?": "What do I know? What should I learn next?",
    "MIN OVERSIKT": "MY OVERVIEW", "Selvmarkert lært": "Self-marked learned",
    "Kursidéer": "Course ideas", "Eksporter min kartlegging (.json)": "Export my map (.json)",
    "Nullstill lokale markeringer": "Reset local marks",
    "Kartleggingen lagres bare i denne nettleseren. Den kan eksporteres, men synkroniseres ikke med konto eller Musikkutdannelse 3.0.": "Your map is stored in this browser only. You can export it; it is not synced to your account or formal curriculum.",
    "FRA KART TIL KURS": "FROM MAP TO LEARNING",
    "Se hullene. Finn sammenhengene. Bygg videre.": "Find gaps. Make connections. Keep learning.",
    "Kartet er et orienterings- og planleggingsverktøy. Faglig godkjenning av kurs krever kildekontroll, dokumentert kompetanse, redaksjonell vurdering og eksplisitt godkjenning.": "The atlas is a planning tool. Course approval requires source review, demonstrated knowledge, editorial review and explicit approval.",
    "Utforsk intervallutkastet ↗": "Explore the intervals draft ↗",
    "Natur som inspirasjon. Musikk som uttrykk.": "Nature as inspiration. Music as expression.",
    "Læringsstien ↗": "Learning path ↗",
    "Læringsstien": "Learning path",
    "Lyd og tonehøyde": "Sound and pitch", "Puls, takt og rytme": "Pulse, metre and rhythm",
    "Tonenavn og intervaller": "Note names and intervals", "Durskalaen": "The major scale",
    "Tonearter og kvintsirkelen": "Keys and the circle of fifths", "Moll og treklanger": "Minor and triads",
    "Diatoniske progresjoner": "Diatonic progressions", "Pentatonikk og gehør": "Pentatonics and ear training",
    "Funksjonsharmonikk": "Functional harmony", "Kadenser og ii–V–I": "Cadences and ii–V–I",
    "Moduser": "Modes", "Motivisk improvisasjon": "Motivic improvisation",
    "Sekundærdominanter": "Secondary dominants", "Modal harmonikk": "Modal harmony",
    "Stemmeføring og reharmonisering": "Voice leading and reharmonization",
    "Oddetakt og form": "Odd metre and form", "Kromatisk harmonikk": "Chromatic harmony",
    "Jazzharmonikk": "Jazz harmony", "Kontrapunkt": "Counterpoint",
    "Orkestrering og produksjon": "Orchestration and production",
    "Strukturell analyse": "Structural analysis", "Eget harmonisk språk": "Developing a harmonic language",
    "Original komposisjon": "Original composition", "Kunstnerisk portefølje": "Artistic portfolio",
    "Musikkens grunnlag": "Music fundamentals", "Rytme og puls": "Rhythm and pulse",
    "Skalaer og modalitet": "Scales and modes", "Harmonikk og analyse": "Harmony and analysis",
    "Gehør og lytting": "Ear training and listening", "Gitar og teknikk": "Guitar and technique",
    "Improvisasjon": "Improvisation", "Komposisjon og form": "Composition and form",
    "Arrangering og produksjon": "Arranging and production", "Musikalsk praksis": "Musical practice",
    "Nye emner kommer": "More topics coming", "MITT MUSIKKATLAS": "MY MUSIC ATLAS",
    "Velg et område": "Choose a subject",
    "Atlaset følger åpnete artikler og fullførte quizer. Du kan også velge en egen status som overstyrer den automatiske statusen. Bestått quiz er ikke en faglig godkjenning.": "The atlas reflects opened articles and completed quizzes. You can override this with a personal status. Passing a quiz is not formal approval.",
    "Dette fagområdet samler ": "This subject groups ", " planlagte moduler. Endrer du status her, får alle modulene i grenen samme egenvurderte status.": " planned modules. Changing the status here applies your assessment to every module in the branch.",
    "MODUL ": "MODULE ", " · NIVÅ ": " · LEVEL ", "FAGOMRÅDE · ": "SUBJECT · ",
    " MODULER": " MODULES", "Åpne modulvisning ↗": "Open module view ↗",
    "Se hele læreplanen ↗": "Explore the curriculum ↗",
    "Hele kartet vises samtidig. Velg et emne for å markere din egen læringsstatus.": "The entire map is visible. Choose a topic to mark your learning status.",
    "Alle atlasmarkeringer er nullstilt. Tidligere quizresultater på kontoen er beholdt.": "All atlas marks have been reset. Previous quiz results in your account are unchanged.",
    "Lagret i denne nettleseren.": "Saved in this browser.",
    "Nettleseren tillot ikke lagring. Bruk eksport for å ta vare på kartleggingen.": "This browser did not allow saving. Export the map to keep your work.",
    "Nullstille all synlig progresjon og alle notater i Musikkatlaset? Quizresultater på kontoen beholdes.": "Reset all visible atlas progress and notes? Quiz results in your account will remain.",
    "Egenvurdert lært": "Self-assessed learned", " fagområder · ": " subjects · ",
    " synlige moduler": " visible modules",
}
def atlas_en_html(page):
    for nb, en in ATLAS_EN.items():
        page = page.replace('>'+nb+'<', '>'+en+'<')
        page = page.replace('>'+nb+' ', '>'+en+' ')
        # Attribute text and long prose can contain punctuation inside quotes.
        if len(nb) > 30:
            page = page.replace(nb, en)
    return page

def atlas_en_js(code):
    for nb, en in ATLAS_EN.items():
        # Replace exact string literals (including template fragments), never JS identifiers.
        quoted_nb = json.dumps(nb, ensure_ascii=False)
        quoted_en = json.dumps(en, ensure_ascii=False)
        code = code.replace(quoted_nb, quoted_en)
    return code

if EN.exists():shutil.rmtree(EN)
EN.mkdir()
for source in list(DIST.rglob('*')):
    if not source.is_file() or EN in source.parents or 'media' in source.relative_to(DIST).parts or source.name in ('redaktor.html','editor.js','editor.css','cms-seed.json','_routes.json','_headers','_worker.js'):continue
    rel=source.relative_to(DIST)
    if rel.parts[:2]==('images','articles') and rel.stem not in english_articles and rel.stem not in english_card_images:continue
    target=EN/rel;target.parent.mkdir(parents=True,exist_ok=True)
    if source.suffix=='.html':
        localized_source=ROOT/'.build-private/en'/rel
        text=localized_source.read_text() if (rel.name=='artikler.html' or rel.parts[0]=='artikler') and localized_source.is_file() else source.read_text()
        page=language_assets(text,'../' if rel.parts[0]=='artikler' else '')
        source.write_text(language_assets(source.read_text(),'../' if rel.parts[0]=='artikler' else ''))
        if localized_source.is_file() and 'design-system.css' not in page:
            prefix='../' if rel.parts[0]=='artikler' else ''
            page=page.replace('</head>',f'<link rel="stylesheet" href="{prefix}design-system.css"></head>',1)
        if rel.parts[0]=='artikler' and rel.stem in english_articles:
            article=next(a for a in json.loads((ROOT/'content/articles.json').read_text()) if a['slug']==rel.stem)
            page=apply_override(page,article,ROOT)
        if rel.as_posix() == 'musikkart.html':
            # Preserve the complete interactive Atlas in English. The map is a
            # personal self-assessment tool, not approved educational content.
            # Keep the exact SVG, inspector, controls and accessible JS hooks.
            page = page.replace('<html lang="nb">', '<html lang="en">', 1)
        if rel.as_posix() == 'laeringssti.html':
            # Separate reviewed English summary: no automatic translation of unapproved lessons.
            page = re.sub(r'<main\b[^>]*>[\s\S]*?</main>', '<main class="path-shell"><section class="path-hero"><p class="path-eyebrow">MODUS / LEARN</p><h1>Your path through <em>music.</em></h1><p class="path-lead">Explore our six-level curriculum, open interactive lesson demonstrations, and connect theory with practical music making.</p><div class="path-actions"><a class="path-action" href="laereplan.html">Explore the curriculum</a><a class="path-action secondary" href="laer-dorisk.html">Explore the Dorian lesson</a></div></section><section class="path-section"><p class="path-eyebrow">LEARNING SPACES</p><h2>One learning path. Different ways to explore.</h2><p class="path-intro">The curriculum outlines the planned modules. The interval exercise is an editorial draft, not an approved course. The Dorian lesson is a separate interactive learning experience.</p><div class="path-grid"><article class="path-card"><h3>Curriculum</h3><p>Six levels and 24 planned modules.</p><a href="laereplan.html">Browse the levels</a></article><article class="path-card"><h3>Dorian mode</h3><p>Explore a six-step interactive lesson.</p><a href="laer-dorisk.html">Open the lesson</a></article><article class="path-card"><h3>Intervals</h3><p>Hear notes on acoustic grand piano and explore an interactive work-in-progress.</p><a href="undervisning.html?modul=F03">Open the demonstration</a></article><article class="path-card"><h3>Music theory tools</h3><p>Explore connections between harmony, listening and playing.</p><a href="teori.html">Open the theory room</a></article></div></section></main>', page, count=1)
        if rel.as_posix() == 'laeringssti.html':
            page = page.replace('<main class="path-shell">', '<main class="path-shell"><section class="journey-resume" id="f03-resume" aria-label="F03"></section>', 1)
        if rel.as_posix() == 'grunnstudier.html':
            # A reviewed, limited English orientation; the detailed exercises remain Norwegian pending editorial review.
            page = re.sub(r'<main\b[^>]*>[\s\S]*?</main>', """<main class="foundation-main"><section class="foundation-hero"><p class="eyebrow">MODUS / FOUNDATION STUDIES</p><h1>Understand the <em>foundations of music.</em></h1><p class="foundation-lead">A six-part guided study route connecting music theory with listening, playing and explaining. The complete practical exercises are currently available in Norwegian while the English version awaits editorial review.</p><div class="foundation-hero-links"><a class="button" href="../grunnstudier.html">Open the Norwegian study route ↗</a><a class="foundation-subtle-link" href="artikler.html">Browse English articles ↗</a></div><p class="foundation-status"><strong>Editorial status:</strong> This is a developing learning route, not an accredited course or qualification.</p></section><section class="foundation-overview"><div><p class="eyebrow">SIX CONNECTED TOPICS</p><h2>Read. Listen. Play. Explain.</h2><p>1. Notes and intervals<br>2. Major, minor and triads<br>3. Keys and diatonic chords<br>4. Roman numerals and harmonic function<br>5. From a scale to a musical phrase<br>6. Your own musical idea</p></div><div class="foundation-route"><a href="artikler/toner-og-intervaller.html">01 · Notes and intervals ↗</a><a href="artikler/dur-og-moll.html">02 · Major and minor ↗</a><a href="artikler/bygg-akkorder-i-en-toneart.html">03 · Diatonic chords ↗</a><a href="artikler/romertall-i-musikk.html">04 · Roman numerals ↗</a><a href="artikler/din-forste-improvisasjon.html">05 · Improvisation ↗</a><a href="artikler/ett-skalakart-nye-maltoner.html">06 · Chord-tone targets ↗</a></div></section></main>""", page, count=1)
        if rel.as_posix() in ('laereplan.html', 'undervisning.html'):
            # No unreviewed auto-translation of a planned curriculum: display a short English notice.
            page = re.sub(r'<main\b[^>]*>[\s\S]*?</main>', '<main class="curriculum"><section class="curriculum-hero"><p class="eyebrow">MODUS / LEARNING / PREVIEW</p><h1>Learning space <em>in development.</em></h1><p class="lead">The Norwegian demonstration is available now. The English version is awaiting editorial review and does not contain approved lessons.</p><p><a class="button" href="../' + rel.name + '">View the Norwegian version <span>↗</span></a></p></section></main>', page, count=1)
            page = page.replace('<script src="undervisning.js" defer></script>', '')
        # Jam-only interface copy must not invalidate version-bound article translations.
        if rel.as_posix() == 'backingtracks.html':
            page=page.replace('>DIN LYD<','>YOUR SOUND<')
        p=EnglishHTML(translate_home if rel.as_posix()=='index.html' else translate);p.feed(page);result=''.join(p.out)
        result=result.replace('<html lang="en">','<html lang="en">',1)
        if rel.as_posix() in policy['learning_pages'] and not is_public(policy['learning_pages'][rel.as_posix()], 'en'):
            result=language_assets(holding_page(active='course' if rel.name=='laer-dorisk.html' else 'path' if rel.name=='grunnstudier.html' else 'lesson',english=True))
        if rel.parts[0]=='artikler' and rel.stem not in english_articles:
            result=language_assets(holding_page('../',active='articles',english=True),'../')
        # Re-run translation for generated holding pages, including shared navigation.
        if 'data-publication-hold' in result:
            translated=EnglishHTML();translated.feed(result);result=''.join(translated.out)
        if rel.as_posix() == 'musikkart.html':
            result=atlas_en_html(result)
        if 'modus-interior' in result:
            # UI-only localization; article bodies and versioned dictionaries stay intact.
            result=re.sub(r'(<header\b.*?</header>)',lambda m:m[0].replace('MUSIKKTEORI · SPILL · FORSTÅ · SKAP','MUSIC THEORY · PLAY · UNDERSTAND · CREATE').replace(' Søk</button>',' Search</button>'),result,count=1,flags=re.S)
            result=re.sub(r'(<a class="interior-skip"[^>]*>)Hopp til innhold',r'\1Skip to content',result,count=1)
            # Some reviewed English landing pages replace their main element.
            main=re.search(r'<main\b[^>]*>',result)
            if main and 'id=' not in main[0]:
                result=result.replace(main[0],main[0].replace('<main','<main id="main-content" tabindex="-1"',1),1)
        target.write_text(result)
    elif source.suffix=='.js' and source.name not in ('language-init.js','language.js','account.js') and not source.name.startswith('account.'):
        if source.name=='learning-premises.js' or source.name.startswith('learning-premises.'):
            target.write_bytes(source.read_bytes())
            continue  # Bilingual UI copy chooses the current HTML language at runtime.
        localized=script(source.read_text())
        if rel.as_posix() == 'musikkart.js':
            localized=atlas_en_js(localized)
        target.write_text(localized)
    elif rel.parts[:2]==('images','articles') and rel.stem in english_card_images:
        # Exact previously used EN bytes; illustration permission does not open text.
        target.write_bytes(english_card_images[rel.stem]['source'].read_bytes())
    elif source.suffix=='.svg':
        ET.register_namespace('', 'http://www.w3.org/2000/svg')
        svg=ET.fromstring(source.read_text())
        for element in svg.iter():
            if element.text: element.text=translate(element.text)
            if element.tail: element.tail=translate(element.tail)
            for key in ('aria-label','title'):
                if key in element.attrib: element.attrib[key]=translate(element.attrib[key])
        target.write_text(ET.tostring(svg, encoding='unicode'))
    else:shutil.copyfile(source,target)
print('Built English pages, scripts and illustrations in dist/en/.')

# Preserve the exact 16 existing English illustration versions, not regenerated variants.
for image in public_illustrations(ROOT,'en').values():
    target=EN/image['src'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(image['source'].read_bytes())

"""Link the existing lessons menu to published learning resources."""
import re

COPY = {
    "": {
        "title": "Leksjoner og øvelser",
        "intro": "Les en teoriartikkel, svar på quizen og prøv det du har lært på pianoet.",
        "article": "Start med Toner og intervaller",
        "next": "Øv og lær videre",
        "piano": "Prøv intervaller på pianoet",
        "route": "Følg leserekkefølgen i Grunnstudier",
        "library": "Finn flere teoriartikler",
    },
    "en/": {
        "title": "Lessons and Exercises",
        "intro": "Read a theory article, take its quiz and try what you learned on the piano.",
        "article": "Start with Notes and Intervals",
        "next": "Practise and keep learning",
        "piano": "Try intervals on the piano",
        "route": "Follow the Foundations study route",
        "library": "Browse more theory articles",
    },
}

INTERVALS = "teori.html?topic=intervals&amp;key=0&amp;fromArticle=toner-og-intervaller&amp;interval=4"
MODULE_GUARD = """<script>
if (new URLSearchParams(location.search).has('modul')) {
  const held = document.getElementById('held-lesson').content.cloneNode(true);
  document.getElementById('main-content').replaceWith(held);
}
</script>"""


STYLESHEET = "learning-route.37ea15b5bf.css"


def render(html, copy):
    held = re.search(r"<main\b[^>]*data-publication-hold[^>]*>[\s\S]*?</main>", html)
    if not held:
        raise ValueError("Expected the published holding page")

    # Preserve the public holding message for old module links. The template
    # contains the existing message only, with no unpublished lesson data.
    entry = f"""<main id="main-content" tabindex="-1" class="path-shell" data-learning-entry>
  <section class="subpage-hero">
    <div class="subpage-hero-copy">
      <p class="path-eyebrow">MODUS / {copy['title']}</p>
      <h1>{copy['title']}</h1>
      <p>{copy['intro']}</p>
      <a class="button" href="artikler/toner-og-intervaller.html">{copy['article']}</a>
    </div>
  </section>
  <section class="learning-route" aria-labelledby="entry-next" style="margin-bottom:84px">
    <header class="route-heading"><h2 id="entry-next">{copy['next']}</h2></header>
    <div class="route-actions">
      <a href="{INTERVALS}">{copy['piano']}</a>
      <a href="grunnstudier.html">{copy['route']}</a>
      <a href="artikler.html">{copy['library']}</a>
    </div>
  </section>
</main>
<template id="held-lesson">{held[0]}</template>
{MODULE_GUARD}"""
    html = html[:held.start()] + entry + html[held.end():]
    return html.replace("</head>", f'<link rel="stylesheet" href="{STYLESHEET}"></head>', 1)


def apply(package):
    for prefix, copy in COPY.items():
        page = package / prefix / "undervisning.html"
        if not (page.parent / STYLESHEET).is_file():
            raise ValueError(f"Missing existing learning route stylesheet for {page}")
        page.write_text(render(page.read_text(), copy))

"""Update the lesson description in the shared static menu."""
OLD_NB = "Prøv undervisningsmoduler under utvikling."
OLD_EN = "Explore teaching modules in development."
NB = "Les teoriartikler, svar på quiz og prøv pianoøvelsen."
EN = "Read theory articles, take quizzes and try the piano exercise."


def hint(text):
    return f'<small id="nav-hint-lesson">{text}</small>'.encode()


def update(html):
    return html.replace(hint(OLD_NB), hint(NB)).replace(hint(OLD_EN), hint(EN))


def previous(html):
    """Restore only the description for historical byte comparisons."""
    return html.replace(hint(NB), hint(OLD_NB)).replace(hint(EN), hint(OLD_EN))


def apply(package):
    for page in package.rglob("*.html"):
        html = page.read_bytes()
        updated = update(html)
        if updated != html:
            page.write_bytes(updated)

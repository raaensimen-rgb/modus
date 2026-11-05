"""Derive the public interior header from the approved homepage, without its hero.

This is build-time CSS composition. No new runtime, content, permission or API path.
"""
import re


def _blocks(css):
    start = 0
    i = 0
    while i < len(css):
        if css[i] != '{':
            i += 1
            continue
        prelude = css[start:i].strip()
        depth, quote, escaped = 1, None, False
        j = i + 1
        while j < len(css) and depth:
            char = css[j]
            if quote:
                if escaped:
                    escaped = False
                elif char == '\\':
                    escaped = True
                elif char == quote:
                    quote = None
            elif char in ('"', "'"):
                quote = char
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
            j += 1
        if depth:
            raise ValueError('Unbalanced approved header CSS')
        yield prelude, css[i + 1:j - 1]
        start = j
        i = j


def header_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    output = []
    for selector, body in _blocks(css):
        if selector.startswith(('@media', '@supports')):
            nested = header_css(body)
            if nested:
                output.append(selector + '{' + nested + '}')
        elif '.site-header' in selector or re.search(r'\.home-(?:geometric|wordmark|tagline)\b', selector):
            selectors = []
            # Selectors here do not contain comma-bearing functions unless already
            # scoped by .modus-home; retain those functional selectors verbatim.
            if '.modus-home' in selector:
                selectors = [selector.replace('.modus-home', '.modus-interior')]
            else:
                selectors = ['.modus-interior ' + part.strip() for part in selector.split(',')]
            output.append(','.join(selectors) + '{' + body + '}')
    return '\n'.join(output)

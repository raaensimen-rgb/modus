"""Generate the MODUS Blue tokens and teaching-art variants in a public site tree."""
from pathlib import Path
import colorsys
import re
import sys

COLOR = re.compile(r"url\([^)]*\)|#([\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b", re.I)
TOKEN = re.compile(r"--modus-([cb])-([a-f0-9]{3,8})\s*:", re.I)
BLUE_SELECTOR = 'html[data-site-palette=blue][data-theme=original]'


def cool_color(value, border=False):
    value = value.lower()
    if len(value) in (3, 4):
        value = "".join(char * 2 for char in value)
    r, g, b = (int(value[index:index + 2], 16) for index in (0, 2, 4))
    hue = colorsys.rgb_to_hsv(r, g, b)[0] * 360
    if not (64 <= hue <= 187 and g - min(r, b) >= 4):
        return None
    lightness = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if border and lightness < 145:
        blue = '415f80'
    elif lightness < 26:
        blue = '0b1421'
    elif lightness < 48:
        blue = '17283c'
    elif lightness < 72:
        blue = '223a55'
    elif lightness < 110:
        blue = '345677'
    elif lightness < 150:
        blue = '6386ad'
    elif lightness < 193:
        blue = '9db9da'
    elif lightness < 227:
        blue = 'bfd3eb'
    else:
        blue = 'e6edf7'
    return '#' + blue + value[6:]


def apply(site):
    for page_root in (site, site / 'en'):
        css = page_root / 'theme-palette.css'
        previous = css.read_text().split(f'\n{BLUE_SELECTOR}{{', 1)[0]
        tokens = []
        for kind, value in sorted(set(TOKEN.findall(previous))):
            blue = cool_color(value, kind == 'b')
            if blue:
                tokens.append(f'--modus-{kind}-{value}:{blue};')
        css.write_text(previous.rstrip() + f'\n{BLUE_SELECTOR}{{\n' + '\n'.join(tokens) + '\n}\n')
        images = page_root / 'images'
        for group in ('articles', 'teaching-diagrams'):
            variants = images / 'modus-blue' / group
            variants.mkdir(parents=True, exist_ok=True)
            for svg in sorted((images / group).glob('*.svg')):
                def substitute(match):
                    color = match.group(1)
                    return (cool_color(color) or match[0]) if color else match[0]
                (variants / svg.name).write_text(COLOR.sub(substitute, svg.read_text()))


if __name__ == '__main__':
    apply(Path(sys.argv[1]))

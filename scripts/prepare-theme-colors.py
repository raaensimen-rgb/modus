"""Expose original CSS colors as optional theme tokens, retaining exact defaults."""
from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1];dist=root/'dist'
colors={}
hex_pattern=re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b')
declaration=re.compile(r'(?P<prop>--[\w-]+|[\w-]+)\s*:\s*(?P<value>[^;{}]+)')
for path in dist.glob('*.css'):
 if path.name in ('themes.css','theme-palette.css'):continue
 text=path.read_text()
 # Collect already-tokenized colors so repeated generation remains stable.
 for kind,color in re.findall(r'var\(--modus-([cb])-([0-9a-f]+),',text):colors[kind+'-'+color]=color
 def replace_decl(match):
  prop=match['prop'];value=match['value']
  kind='b' if any(word in prop for word in ['border','outline']) or prop.endswith('-line') or prop=='--line' else 'c'
  def color(match):
   original=match[1].lower();token=kind+'-'+original;colors[token]=original
   return f'var(--modus-{token},#{original})'
  # Existing tokenized declarations are not rewritten.
  if '--modus-' not in value:value=hex_pattern.sub(color,value)
  return prop+':'+value
 path.write_text(declaration.sub(replace_decl,text))
def components(value):
 if len(value) in (3,4):value=''.join(c*2 for c in value)
 return tuple(int(value[i:i+2],16) for i in (0,2,4)),value[6:] if len(value)==8 else ''
def readable(value,kind):
 rgb,alpha=components(value);r,g,b=rgb;light=(.2126*r+.7152*g+.0722*b)/255
 if kind=='b':base='7a8970'
 elif value[:6] in ['d7f48c','e7ffb4','e5ffb0','e5ffad','e5ffb4','e7ffad']:base='245b34'
 elif light<.09:base='f0efe6'
 elif light<.145:base='f6f4ed'
 elif light<.22:base='fffef8'
 elif light<.33:base='e4ead9'
 elif light<.47:base='849474'
 elif light<.65:base='4c5c40'
 elif r>g*1.08 and g>b*1.15:base='715021'
 else:base='1b2a20'
 return '#'+base+alpha
def contrast(value,kind):
 rgb,alpha=components(value);light=sum(c*w for c,w in zip(rgb,[.2126,.7152,.0722]))/255
 return '#000000' if kind=='b' or light>=.48 else '#ffffff'
parts=['/* Generated palette mappings. Original colors remain the CSS fallbacks. */']
for mode,fn in [('readable',readable),('contrast',contrast)]:
 parts.append(f'html[data-theme="{mode}"]'+'{')
 parts.extend(f'--modus-{token}:{fn(value,token[0])};' for token,value in sorted(colors.items()))
 parts.append('}')
(dist/'theme-palette.css').write_text('\n'.join(parts)+'\n')
print(f'Prepared {len(colors)} original color tokens and two alternate palettes.')

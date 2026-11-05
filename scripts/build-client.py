"""Select offline entry points before bundling; never bundle an SDK in isolated mode."""
from pathlib import Path
import subprocess,sys
from preview_mode import isolated
root=Path(__file__).resolve().parents[1]
mode=isolated();kind=sys.argv[1]
if kind=='cms' and mode:
    raise SystemExit('CMS runtime builds are forbidden in isolated Preview')
if kind=='editor' and mode:
    (root/'dist/editor.js').write_text('// Isolated Preview: editor runtime is not built.\n')
    raise SystemExit(0)
entry={'account':'client/preview-account.js' if mode else 'client/account.js','editor':'client/editor.js','cms':'cms/worker.mjs'}[kind]
out={'account':'account.js','editor':'editor.js','cms':'_worker.js'}[kind]
subprocess.run([str(root/'node_modules/.bin/esbuild'),entry,'--bundle','--minify','--format='+('iife' if kind=='account' else 'esm'),'--target='+('es2020' if kind=='account' else 'es2022'),'--outfile=dist/'+out],cwd=root,check=True)

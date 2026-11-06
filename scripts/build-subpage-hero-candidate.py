"""Compatibility entry point; never reconstruct a superseded public baseline."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('build-local-candidate.py')),run_name='__main__')

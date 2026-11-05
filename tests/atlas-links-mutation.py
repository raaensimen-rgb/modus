"""PL-068: deliberately corrupt editorial atlas links and require validation failure."""
from copy import deepcopy
from pathlib import Path
import runpy

checks = runpy.run_path(str(Path(__file__).with_name("atlas-links.py")))
validate = checks["validate_planned_links"]
original = checks["pending"]
module_ids = checks["module_ids"]

validate(deepcopy(original), module_ids)
cases = [
    ("invalid primary", lambda a: a[0].__setitem__("module_id", "ZZ99")),
    ("invalid secondary", lambda a: a[1].__setitem__("related_module_ids", ["ZZ99"])),
    ("missing required primary", lambda a: a[0].pop("module_id")),
    ("missing required secondary list", lambda a: a[1].pop("related_module_ids")),
]
for name, mutate in cases:
    changed = deepcopy(original)
    mutate(changed)
    try:
        validate(changed, module_ids)
    except AssertionError:
        print(f"PASS: {name} rejected")
    else:
        raise AssertionError(f"FAIL: {name} was accepted")
print("Atlas reference mutation tests passed: 4/4 deliberately invalid cases rejected.")

"""Prove that missing/empty translations and corrupt catalogue rows fail."""
import json
from pathlib import Path
import runpy
import unittest

checks = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/check-translations.py"))
validate = checks["validate"]


class TranslationChecks(unittest.TestCase):
    def test_valid_and_retired_sources(self):
        self.assertEqual(validate(["Hei", "Utgått"], {"Hei": "Hello"}, "", {"Hei"}), (1, 1))

    def test_missing_translation(self):
        with self.assertRaisesRegex(ValueError, "Missing registered"):
            validate(["Hei"], {}, "", {"Hei"})

    def test_empty_translation(self):
        with self.assertRaisesRegex(ValueError, "Empty or invalid"):
            validate(["Hei"], {"Hei": " "}, "", {"Hei"})

    def test_dynamic_translation(self):
        self.assertEqual(validate(["Hei"], {}, "Hei\tHello\n", {"Hei"}), (1, 0))

    def test_bad_dynamic_rows(self):
        for text in ["Hei", "Hei\t", "Hei\tHello\textra", "Hei\tHello\nHei\tHi"]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                validate(["Hei"], {}, text, {"Hei"})

    def test_duplicate_json_key(self):
        with self.assertRaisesRegex(ValueError, "Duplicate translation"):
            json.loads('{"Hei":"Hello","Hei":"Hi"}', object_pairs_hook=checks["unique_object"])

    def test_missing_build_or_bad_inventory(self):
        for sources, active in [(["Hei"], set()), ({"Hei": "Hello"}, {"Hei"})]:
            with self.subTest(sources=sources), self.assertRaises(ValueError):
                validate(sources, {"Hei": "Hello"}, "", active)

    def test_html_extraction(self):
        parser = checks["VisibleStrings"]()
        parser.feed('<p>Hei</p><img alt="Et bilde"><script>Ignorer</script><style>Ignorer</style>')
        self.assertEqual(parser.strings, {"Hei", "Et bilde"})


if __name__ == "__main__":
    unittest.main()

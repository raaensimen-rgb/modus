# Visning og lesbarhet

Alle sider deler «Visning»-kontrollen via scripts/site_navigation.py.
Valgene er original, readable og contrast. Browser-lokal lagringsnøkkel er
modus-theme-v1. Ingen persondata eller synsopplysninger lagres.

- theme-init.js leses før stilark og gjenoppretter gyldig valg før første visning.
- theme.js styrer radiofeltene, statusmelding, Escape, klikk utenfor og andre faner.
- themes.css inneholder kontrollen og justeringer for lesbarhet/forenkling.
- theme-palette.css genereres fra eksisterende CSS-farger. Originalfargene står
  som fallback i CSS, så originalvisningen beholder fargepaletten.
- Faglige illustrasjoner og instrumentkart beholdes. Høykontrast viser dem
  i gråtoner; dekorative landskap og animasjoner skjules.

Ved nye CSS-farger: kjør python scripts/prepare-theme-colors.py.
Ved nye artikler: python scripts/build-articles.py.
Etter endring av fellesmenyen: python scripts/sync-navigation.py.
Palettskriptet hopper over themes.css og sin egen genererte palett.

Kontrollert: alle tre valg i nettleser, sidebytte mellom forsiden/artikkel/jam/
medlemskap, vedvarende valg og Escape. Unit-kontroll: node tests/themes.cjs.
Kontrastforhold for hovedtekst, sekundærtekst og primærknapp i lys visning er
henholdsvis 13,6:1, 8,2:1 og 7,3:1; svart-hvitt-parets forhold er 21:1.
Dette er punktkontroller, ikke en full tilgjengelighetssertifisering.

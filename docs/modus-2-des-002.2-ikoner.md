# DES-002.2 – siste ikonjustering

Lokalt på `dev/modus-2-pr52`. Hovedmeny, kontrollstørrelser, plasseringer og trefflater er beholdt.

- MODUS+: rent plusstegn.
- Logg inn: personkontur uten omramming.
- NO/EN: samme geometriske globusikon; aktivt språk markeres med gulgrønn farge og understreking.
- Søk: forstørrelsesglass uten diamantramme.
- Visning: sirkel med en fylt halvdel.
- Alle symboler bruker eksisterende `home-control-icon`-komponent, samme 22 px-boks og 1,25 enheters strek. Dekorative SVG-er er skjult for skjermleser og er ikke egne fokuspunkter.
- Glød er dempet. KOMMER/COMING SOON er plassert absolutt under MODUS+-etiketten og endrer ikke tekstens eller kontrollens bredde. Testen kontrollerer at merket ikke overlapper etiketten eller går utenfor kontrollens bredde, også på engelsk mobil.

Endret: `scripts/site_navigation.py`, `home-2.css` og den målrettede `tests/des002-reference-browser.cjs`.

Bestått: isolert bygg, 37 ordinære tester, 20 nettleser/bredde/språk-kombinasjoner i Chromium/WebKit på 320/375/768/1024/1440 px, tre temaer, språkbytte, søk, visning, meny/tastatur/fokus og 24 WCAG A/AA-analyser uten rapporterte brudd. `git diff --check` for kilder er rent.

Faktiske lokale skjermbilder før publisering finnes i `test-results/des002-icons/`, inkludert `chromium-header-1440-nb.png`, `chromium-header-375-nb.png` og engelske/WebKit-varianter. Resultater ligger i samme mappe. Førkopier, logger og kildehashverdier ligger i `.local-development/des002-icons/`.

Ingen ny publisering, produksjonsendring, Git-push eller endring av main. Tidligere øvrige lokale endringer er bevart. Den siste dokumenterte Access-kontrollen ga HTTP 403; verifisert tilgangsbeskyttelse kreves før en senere deployment. Ingen nye Cloudflare- eller autentiseringsforsøk er gjort i denne ikonøkten.

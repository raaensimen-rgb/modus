# DES-002.2 – siste mobile layoutjustering

Utført lokalt på `dev/modus-2-pr52`. Ingen publisering, Git-push eller endring av main/produksjon. Eksisterende lokale endringer er bevart.

Kun 320–375 CSS-piksler endres:

- Sekundærkontroller i tre like kolonner og to rader: **MODUS+ · Logg inn · NO / EN · Søk · Visning**.
- Like cellebredder, sentrerte godkjente ikoner/etiketter, 56 px cellehøyde og jevne mellomrom. Trefflatene er minst 44 × 44 px.
- Hovedmenyen bruker tre punkter per rad. «Mitt musikkatlas» og «My music atlas» får bryte over to tekstlinjer uten å redusere skriftstørrelsen.
- Språknavigasjonens semantiske `nav`-element bevares som en CSS-subgrid. Ingen `display:contents`, fjerning av språkgruppe eller endring av lenker/listenere.
- Fokus, valgt språk, ikoner, KOMMER-merke og fungerende undermenyer beholdes.

Desktop er uendret. Norsk Chromium-desktop før/etter har identiske PNG-bytes, SHA-256 `898c76b7636174375b7ef99744119d939aef328ea6ba17fe0f2c44079d6d2c52`. Computed styles og elementgeometri er også sammenlignet mot før-CSS på desktop i begge språk og motorer.

Endrede kildefiler i denne økten: `home-2.css` og `tests/des002-reference-browser.cjs`. Før-CSS, logger, kildehashverdier og desktop-sammenligning ligger i `.local-development/des002-mobile/`.

Tester: isolert bygg bestått, 37 ordinære tester bestått, 20 kombinasjoner av nettlesermotor/bredde/språk bestått (Chromium/WebKit, 320/375/768/1024/1440 px), tre temaer, seks faktiske gridposisjoner, lik bredde, trefflater, fokus, søk, språkbytte og faktiske klikk på begge undermenyenes lenker. 24 WCAG A/AA-analyser uten rapporterte brudd. Ingen horisontal overflow. Kildenes whitespace-kontroll er ren.

Nye, faktisk lokalt gjengitte mobilbilder:

- `test-results/des002-mobile/chromium-header-320-nb.png`
- `test-results/des002-mobile/chromium-header-375-nb.png`
- `test-results/des002-mobile/webkit-header-320-en.png`
- `test-results/des002-mobile/webkit-header-375-en.png`

Øvrige motor-/språkvarianter og resultater ligger i samme mappe. Bildene er **ikke publisert Preview**. Publisering avventer gjeldende sikkerhetskrav; ingen Cloudflare-/autentiseringsforsøk er gjort i denne økten.

Eksisterende oversettelsesavvik utenfor layoutrettingen: den engelske søkeknappens synlige etikett er fortsatt «SØK» fra forrige ikonendring, mens søket og dialogen fungerer på engelsk. Dette er ikke endret her for å bevare godkjent desktop og avgrensningen til mobil layout.

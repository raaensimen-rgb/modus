# ST-001 — MODUS Studio Designspesifikasjon 1.0

**Status:** Design 3.0-retning godkjent av prosjekteier i PR #40; implementert UI krever fortsatt 01-kontroll. **Dato:** 2026-10-31.

## Mål
Studio skal oppleves som samme produktfamilie som MODUS.NO, med samme visuelle identitet, men tilpasset en fokusert macOS-arbeidsflate. Nettsiden er læringsplattform; Studio er et privat arbeidsverktøy. Ikke kopier hele nettsiden ukritisk.

## Visuell basis – obligatorisk samsvar med nettstedet

**Fasit: de faktiske fargene og stilene i `home.css`, `design-system.css`, `themes.css` og de relevante redaktørstilene på MODUS.NO. Ikke definer en alternativ blå Studio-palett.**

Nettstedets standardtema i `home.css` definerer:
- `--bg: #111310` (bakgrunn)
- `--panel: #1a1d18` (panel)
- `--line: #30372a` (skillelinjer)
- `--ink: #f0f0e6` (hovedtekst)
- `--muted: #a5ad9a` (sekundærtekst)
- `--accent: #d7f48c` (aksent)
- Typografi: **DM Sans** og **Manrope** fra nettstedet (med tilgjengelig macOS-fallback). Avklar lovlig/distribuerbar fontleveranse før bundling.
- Designsystemet bruker kort-radius 13px og fokusfarge lik `--accent`.

Studio skal gjenbruke disse som design-tokens og følge nettstedets aktive tema-logikk der dette er hensiktsmessig. Avvik krever 01-vurdering og begrunnelse. Ingen nye identitetsfarger uten prosjekteiers godkjenning.

## Layout
1. Mac-vindu med rolig toppfelt og fast venstremenynavigasjon.
2. Artikler: artikkelbibliotek / redigering / forhåndsvisning. Paneler får justerbar bredde på sikt.
3. Design og UX som separat arbeidsflate med designbibliotek, komponentprøving, kvalitetssjekk og registrering av forslag.
4. Samme kort, knapper, statusetiketter, teksthierarki, radiuser og spacing som nettstedet, med ergonomiske desktop-tilpasninger.

## Redaktørintegrasjon
- Arv artikkelskjema fra `content/articles.json` og logikk fra `cms/model.mjs` og `client/editor.js` der det er forsvarlig.
- Visuell seksjonsredigering prioriteres foran rå JSON i senere MVP-runde.
- Inkluder locale, nivå, kategori, tittel, introduksjon, øvelse, praksislenker, bilde og quiz uten utilsiktet datatap.
- Forhåndsvisning med likt uttrykk som MODUS-artikler, men sikker sanitizing og isolert fra privilegerte Tauri-API-er.
- Statusene utkast, under faglig kontroll og godkjent skal ikke automatisere faglig godkjenning.
- Ingen direkte publisering, nettverkssynkronisering eller automatisk GitHub-skriving.

## UX-kvalitetskrav
- Test på macOS ved små og store vinduer; bruk tastatur, VoiceOver der mulig, fokus og kontrast.
- Minimer behovet for å redigere JSON manuelt.
- Varsle om ulagrede endringer før navigasjon/filbytte; lagre eksplisitt som lokal kopi.
- Skille tydelig mellom aktiv funksjonalitet, forhåndsvisning og planlagte områder.
- Respekter redusert bevegelse; unngå unødvendige animasjoner.

## Arbeidspakker
- **01 Design og UX:** gjennomgå nettstedet og redaktørens faktiske CSS, bekreft tokens, komponenter, mobil- og desktoputtrykk. Dokumenter avvik.
- **02 Funksjoner/programmering:** schema-kompatibilitet, trygg renderer og visuell editor.
- **08 Automatisk Coding:** implementer i isolert Studio-gren etter prioriterte F03-oppgaver.
- **07 QA:** visuell QA, ekte macOS-installasjon, no/en, lagrings- og sikkerhetstester.
- **00 Prosjektledelse:** beslutning etter dokumentert QA; ingen merge eller distribusjon uten godkjenning.

## Implementert per 31.10.2026
Mørk app-shell, navigasjon Artikler/Design og UX, artikkelsøk, enkel editor, tekstforhåndsvisning og lokal eksport av designnotater. Disse elementene er kildekode i Draft-PR #40, ikke godkjent installert app.

## Ikke ferdig
Produksjonslik HTML-preview, visuell seksjonsredigering, AI-designagent, direkte designendringer, reproduserbar macOS-installasjon og faktisk QA.

## ST-002 / 0.2.0
Artikkelbibliotek med kort, valgt-status, søk og nivåfilter erstatter systemlisten. Seksjonsnavigasjon og HTML-formateringshjelpere er implementert. Standard MODUS-tokens er samlet i studio/src/style.css; blå restfarger er fjernet. Se ST-002-QA.md for testomfang og gjenstående faktisk Mac-/designkontroll. Tidligere avsnitt beskriver historisk førsteutkast, ikke ny teststatus.

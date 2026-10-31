# ST-001 — MODUS Studio Designspesifikasjon 1.0

**Status:** Foreslått designretning, til gjennomgang hos 01 – Design og UX. **Dato:** 2026-10-31.

## Mål
Studio skal oppleves som samme produktfamilie som MODUS.NO, med samme visuelle identitet, men tilpasset en fokusert macOS-arbeidsflate. Nettsiden er læringsplattform; Studio er et privat arbeidsverktøy. Ikke kopier hele nettsiden ukritisk.

## Visuell basis
Foreløpige Studio-tokens, **ikke bekreftet eksakt kopi av nettsidens CSS**:
- Hovedbakgrunn: `#0b1220`
- Sidepanel: `#0e192b`
- Innholdspanel: `#15233a`
- Felter: `#0d192c`
- Aksent: `#91b5ff`
- Lys tekst: `#eaf1ff`
- Sekundærtekst: `#a3b5cc`
- Kortavrunding: 10–15 px
- Fokusmarkering: synlig kontrast, også ved tastatur

**Må valideres av 01 mot faktiske CSS-kilder og redaktørdesign** før noen hevder identisk identitet. Bruk felles tokens fremfor divergerende kopier når dette er teknisk mulig.

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

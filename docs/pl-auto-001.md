# PL-AUTO-001 – én lokal leveranseflyt

Ingen nye tjenester, avhengigheter, betalte komponenter eller bakgrunnsjobber. Eksisterende bygg, tester, pakkekontroller og GitHub Actions gjenbrukes. Ingen automatisk deploy.

## Anbefalt arbeidsflyt

1. Gjør avgrensede kodeendringer i en isolert kopi på `dev/modus-2-pr52`. Bevar original arbeidsmappe og private data. Lag en lokal kildecommit; ingen push eller merge.
2. Kjør `npm run preview:workflow -- prepare --kind admin --source /absolutt/ren/kilde --sha FULL_SHA --out /privat/ny/resultatmappe`. Bruk `--kind public` for offentlig visuell Preview. Kommandoen krever eksisterende låste avhengigheter og installerte testnettlesere, bygger, kjører relevante eksisterende tester og kontrollerer sluttpakken. Den installerer ingenting og sletter ingen eksisterende resultatmapper.
3. Les `report.md` og `report.json`. Godkjenn eksakt kilde-SHA, `candidate.zip` sin SHA-256 og riktig mål før opplasting. Rapportstatus READY_FOR_OWNER_REVIEW betyr kun lokal kandidat, ikke skytilgang eller publiseringstillatelse. Bygg på nytt ved kildeendringer.
4. Etter særskilt godkjenning: bruk eksisterende Wrangler-opplasting med eksplisitt `--project-name=modus-2-preview`, korrekt godkjent gren og kilde-SHA, fra separat stagingmappe med kontrollert config. Bruk aldri rotmappens produksjonskonfigurasjon. Offentlig rotadresse og beskyttet administratorgren har forskjellige formål; ingen felles opplasting. Kontroller Pages-prosjekt/deployment-metadata via etablert tilgang før og etter opplasting. Ingen opplasting håndteres av dette skriptet.
5. Kjør `npm run preview:workflow -- verify --kind public --source /absolutt/ren/kilde --sha FULL_SHA --package /absolutt/pakke --url https://modus-2-preview.pages.dev --url https://HASH.modus-2-preview.pages.dev --out /privat/ny/verifiseringsmappe`. Hele det publiserte innholdet, inkludert versjonsmanifest, CSS og språkfiler, sammenlignes med lokale SHA-256. Pages-konfigurasjonsfiler `_headers`/`_redirects` serveres ikke som ressurser og unntas bytekontrollen. Bare forventet samme-origin `.html`-normalisering følges; ingen vilkårlige omdirigeringer.
6. For administrator: bruk `--kind admin`, grenadressen `https://dev-modus-2-pr52.modus-2-preview.pages.dev` og faktisk hashadresse. Alle serverbare pakkefiler testes anonymt med GET, HEAD og Range. Bare omdirigering til eksisterende Access-team godtas; generisk 403 regnes ikke som verifisert Access. Dette beviser ikke eierpolicy eller innlogget funksjon. Kontroller eierinnlogging interaktivt og utfør en kort Safari-kontroll før private utkast brukes. Skriptet henter aldri cookies, OTP eller API-nøkler.

## Faktisk implementert

- `scripts/preview-workflow.py`: lokal prepare/verify, rent kildegrunnlag, eksakt SHA, manifestkontroll, kandidat-ZIP med SHA-256, korte maskinlesbare og menneskelesbare rapporter også ved feil. Avviser MODUS.NO, `modus.pages.dev`, offentlig adminrot, feil SHA, ekstra/endret pakkefil og symlenker. To separate eksisterende byggeløp, ingen ny byggearkitektur.
- Offentlig kontroll: eksisterende isolert bygg, artifact gate, publikasjonssjekk, DES-002-navigasjon og Preview-isolasjon i nettleser.
- Administratorkontroll: eksisterende separat offline-bygg, streng pakkekontroll og Chromium/WebKit-testmatrise for NB/EN, mobil og desktop, lokal lagring, eksport, gjenoppretting og tilgjengelighet.
- `tests/preview-workflow.py`: negative tester for mål, kildegrunnlag, pakkemanipulering, feil publiserte bytes og falske Access-svar. Gjenbrukes i eksisterende `npm test` og GitHub Actions; ingen ny CI eller skyhemmelighet.
- CMS: eksisterende 500 ms automatisk lokal utkastslagring supplert med umiddelbar lagring ved `pagehide` og skjult fane, slik at mobilens suspendering ikke er avhengig av `beforeunload`. Eksisterende vern mot lagringsfeil, ødelagte kopier og revisjonskonflikter består. Nye NB/EN-regresjonstester bekrefter at ingen serverlagring utløses.

## Bevisste grenser og gjenstående kontroll

Utkast og RED-data ligger fortsatt i localStorage per nettleser og origin, uten enhetssynkronisering. Eksisterende sikkerhetskopieksport og gjenoppretting som bevarer eksisterende kopier gjenbrukes. Automatisk ekstern filbackup er ikke lagt til: lokal nettleserlagring er ikke en uavhengig sikkerhetskopi, og nedlastinger krever brukerhandling. Ta privat eksport før nettleserbytte eller tømming av nettleserdata.

Automatisk faglig godkjenning, artikkelpublisering, databaseaktivering, AI, produksjonsdeploy og Access-konfigurasjon er fortsatt deaktivert. Ingen rettighetsuavklarte medier legges til. Lokale pakkekontroller erstatter ikke prosjekteiers innholdsvurdering. Verifikatoren dokumenterer serverte bytes/anonym Access-grense; deployment-ID og Pages-prosjektmetadata må fortsatt kontrolleres med eksisterende autorisert skytilgang. Innlogget Access-kontroll kan ikke erstattes av en anonym test.

GitHub Actions-endringen er bare lokal inntil en separat godkjent push; eksisterende CI-utløsere er uendret. Ingen tidsstyrt Codex-automatisering er opprettet: arbeidet gjelder den kodeutløste leveranseflyten og trenger ingen løpende kvotebruk.

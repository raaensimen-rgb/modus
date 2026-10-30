# AC-083 – Safari og Escape i globalt søk

Utgangspunkt: `main` på `41449f99b39f45fd8c28a4ac7569dc32610fbedc`.
Arbeidsgren: `fix/ac-083-safari-search-escape`.

## Analyse og rettelse

Utgangspunktet har allerede `keydown` i capture-fasen på dialogen, `cancel`
med eksplisitt lukking og en `close`-lytter som returnerer fokus til
søkeknappen. Det er derfor ikke riktig å beskrive avviket som en manglende
Escape-lytter. Eksisterende test kalte dialogens lytter direkte og modellerte
ikke hendelsesrekkefølgen eller nettleserens søkekontroll.

Sannsynlig årsak til det rapporterte Safari-avviket er samspill mellom
`input type="search"`, kontrollens innebygde Escape-til-tømming og dialogens
lukking. Dette er en arbeidshypotese; avviket er ikke reprodusert i faktisk
Safari i denne leveransen. Dokumentasjonen beskriver nettleserspesifikke
søkeegenskaper, men beviser ikke årsaken i den aktuelle Safari-versjonen:

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/search
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/searchbox_role

Rettelsen fjerner avhengigheten av den native søkekontrollens Escape-atferd:

- Den felles navigasjonsmalen bruker `type="text" role="searchbox"`, med
  eksisterende label og `inputmode="search" enterkeyhint="search"`.
- Escape fanges i dokumentets capture-fase, før dialog-/inputhåndterere.
  Håndteringen gjelder bare mens søkedialogen er åpen og ikke ved
  `isComposing`. `preventDefault` og `stopPropagation` beholdes.
- Eksisterende `cancel`, lukkeknapp, bakgrunnsklikk og fokusretur beholdes.
- Vanlig sletting i feltet lukker ikke søket. Escape lukker uten å tømme
  søket; ingen ekstra keyup-lytter som kan lukke andre vinduer legges til.

Konsekvens: Nettleserens native tømmeikon for `type="search"` følger ikke
med tekstfeltet. Brukeren kan fortsatt slette søket normalt. Dette er et
bevisst, avgrenset kompromiss for forutsigbar Escape-håndtering.

## Automatiske regresjonskontroller

`tests/global-search.cjs` kontrollerer genererte norske og engelske felt og
modellerer capture/target/bubble i en isolert VM. Den kontrollerer:

- Escape med tomt og utfylt felt, og at søket ikke tømmes ved lukking.
- Nøyaktig én lukking og fokusretur til søkeknappen.
- En inputlytter som ville konsumert Escape får ikke hendelsen.
- Escape når dialogen er lukket påvirker ikke fokus eller standardatferd.
- IME-komposisjon og vanlig tastetrykk avbrytes ikke av søkets Escape-lytter.
- Escape fra lukkeknappen, native `cancel`, lukkeknapp og bakgrunnsklikk.
- Vanlig tømming av søkefeltet viser tomtilstand uten å lukke dialogen.
- Eksisterende treff, ingen treff, språk, lenker og tastatursnarvei.

Validering: `npm ci`, `npm run build`, `npm test`. Resultat og eksakt
rettelsescommit oppgis i PR-en og leveranserapporten. Genererte sideendringer
utenfor rettelsen inngår ikke i commit; byggingen regenererer navigasjonen.

## Gjenstående uavhengig QA-07

Ikke godkjent for merge på grunnlag av disse testene alene. Test samme
rettelsescommit i faktisk Safari, og noter macOS/iOS- og Safari-versjon:

1. Åpne søk, skriv «dorisk», trykk Escape én gang. Dialogen skal lukke,
   søkeknappen få fokus og søket ikke bare bli tømt.
2. Gjenta med tomt felt, uten treff og etter ny åpning.
3. Kontroller Tab/Shift+Tab, Escape fra lukkeknapp og resultatlenke, samt
   Enter på valgt treff. Kontroller søkeknapp og Cmd/Ctrl+K.
4. Kontroller manuell tømming, normal skriving, eventuell IME-komposisjon,
   bakgrunnsklikk og lukkeknappen.
5. Kontroller norsk/engelsk, 1440/375 px og 200 % tekst. Bekreft at layout og
   tilgjengelig navn/rolle fortsatt fungerer. Mobil tastaturhint er ikke
   bevis på fysisk Escape-støtte; ekstern tastaturtesting noteres særskilt.

VM-testene erstatter ikke nettleserens native dialog, asynkrone close-event,
fokusfelle eller OS-tastaturbehandling. Ingen merge, eksplisitt Cloudflare-
publisering, betalingsendring eller endring av progresjonsdata inngår.

# MODUS Studio — ST-001 / første kodeutkast

**Status:** Utestet Tauri 2-kildeskjelett. Ikke en ferdig eller signert macOS-app. Oppgaven ligger isolert i `studio/`; nettstedets build er uendret.

## MVP-funksjoner
- Åpne en lokal JSON-artikkelliste (samme overordnede struktur som `content/articles.json`).
- Velge artikkel og redigere tittel, introduksjon og seksjoner.
- Tekstbasert forhåndsvisning uten å kjøre artikkel-HTML.
- Lagre JSON som **ny** fil ved hjelp av macOS fildialog; eksisterende filer overskrives ikke.
- Ingen automatisk nettsidepublisering, GitHub, Supabase, konto eller AI-agent.

## Bygg på Mac
Installer Rust, Xcode Command Line Tools, Node.js og Tauri 2-forutsetninger. Kjør:

```sh
cd studio
npm install
npm run dev:mac
npm run build:mac
```

For signert/notarisert offentlig distribusjon kreves egen Apple-prosess og godkjenning. Ta vare på `package-lock.json` og `Cargo.lock` etter første vellykkede installering før QA.

## Sikkerhet og begrensninger
- Filvalg skjer via native dialog; filsystem skrives bare gjennom Rust-kommandoer.
- Redigerte HTML-seksjoner behandles som tekst i forhåndsvisningen. Riktig HTML-renderer må designes med sanitization før produksjonsbruk.
- Lokal JSON-validering er bevisst minimal; 02 må kvalitetssikre full samsvar med `cms/model.mjs` og norsk/engelsk datamodell.
- Lagring krever nytt filnavn og har ingen overskriving. Ulagret arbeid håndteres enkelt, men recovery/backup og feiltilfeller må QA-testes.
- Ingen installerbar artefakt er bygget i dette arbeidet. Faktisk macOS-kompilering, installasjon, åpning, signering og QA-07 gjenstår.

## Prosjektgrenser
F03 Issue #28 går foran videre ST-001-arbeid. Ingen merge eller publisering uten eksplisitt godkjenning.

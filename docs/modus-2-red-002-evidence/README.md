# RED-002 lokale bevis

Kilde-HEAD: `2f2a2c2787af9f680731dc6ed09434c1d78857ac`. Kjør kommandoer fra prosjektroten. Se hovedrapporten for miljø og avgrensning.

Tre nye karakteriseringstester er kopiert fra `test-results/red-002/`; de bruker bare syntetiske testdata. `model-roundtrip.mjs` leser eksisterende kilder i minnet uten å logge manus. Browserharnessen bundler faktisk klient med simulert SDK og blokkerer eksternt nettverk; den er ikke en databasetest. Loggene inneholder ikke credentials eller private tekster.

`source-manifest.json` binder 18 analyserte kildefiler til HEAD. `publication-audit.json` og `artifact-check.json` inneholder hele distribusjonsmanifestet. `SHA256SUMS` gjelder alle øvrige filer i denne evidensmappen, ikke rapporten eller seg selv.

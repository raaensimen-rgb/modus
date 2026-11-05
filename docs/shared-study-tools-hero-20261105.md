# Felles hero for Studier og Verktøy — lokal kandidat

Grunnlag: nyeste publiserte fe94e064df70290c852a16936f25289cd19dfae5.
Visuell referanse: Skjermbilde 2026-11-05 kl. 20.53.18.png fra referert chat.
Begge vedlegg ble hentet fra chatvedlegg og visuelt kontrollert.

Menyens faktiske sider: laeringssti, laereplan, undervisning, teori,
backingtracks, akkorder. Relaterte studiesider: grunnstudier, laer-dorisk,
f03-laeringsreise. MODUS+ er lagt til etter egen bestilling. Alle ti ruter får felles hero på NB og EN.
Studierute.html tilhører artikkelbibliotekets separate leveranse og er urørt.

Eksisterende modus-design-landscape.png og modus-continuous-wave.svg gjenbrukes.
Sidens tittel, ingress, status og CTA bevares. Ingen forsideordlyd kopieres.
F03 bruker eksisterende dynamiske header via CSS; alle runtime-JS-filer er urørt.
Eksisterende private undervisningsruter forblir holdt. Ingen nye sperrer innføres.
Start å lære: eksisterende resume/progresjonskort flyttes rett under heroen.

Felles CSS er begrenset til shared-hero-page og endrer ingen menyregler.
Heroen vokser med innholdet, har minstehøyde 380/400 px desktop/mobil,
44 px lenketreffflater, synlig fokus og egne lese-/kontrastmoduser.

Bygg ordinær kilde: npm run build
Bygg avgrenset kandidat: npm run build:hero-candidate
Kandidaten bygges på hash-verifisert siste offentlig pakke i søskenoppdraget.
Full SHA-256-liste ligger i release-inputs/hero-baseline-files.json.
Dette unngår eldre historiske forskjeller i vanlig dist/ og bevarer siste
bibliotek, film, knapp, navigasjon, administrator og sikkerhetsoppsett.

Kontroller: npm test; python3 tests/subpage-hero-preservation.py;
node tests/subpage-hero-browser.cjs (lokal loopback-server kreves).
Ingen push, merge, deploy, database-, main- eller MODUS.NO-endring.

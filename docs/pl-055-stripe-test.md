# PL-055 – Stripe testmodus (under utvikling)

## Hva som er lagt inn

- Isolert modul `cms/stripe-test.mjs` for test-Checkout og test-Customer Portal.
- All Stripe-kommunikasjon utføres på serversiden.
- Supabase JWT verifiseres via Auth før en bruker kan få en sesjon.
- Stripe-kunde kobles til autentisert bruker via en serverbeskyttet tabell.
- Integrasjonen er deaktivert som standard og krever eksplisitt `MODUS_STRIPE_TEST_ENABLED=true`.
- Krever `sk_test_`-nøkkel. Ingen støtte for `sk_live_` i denne modulen.

## Først etter særskilt teknisk og juridisk avklaring

1. Gjennomgå SQL-skjemaet i `supabase/stripe-customers.sql` og opprett tabellen manuelt i riktig Supabase-prosjekt.
2. Opprett et **testprodukt og en testpris** i Stripe. Pris, valuta og faktureringsmodell må godkjennes før dette.
3. Sett hemmeligheter i isolert Cloudflare *testmiljø*: `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, samt `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PRICE_ID`, `MODUS_PUBLIC_ORIGIN`.
4. Monter handleren i et isolert test-Worker-endepunkt, ikke i publiseringsarbeidet for artikkel-PR #9.
5. Lag frontend med eksplisitt testmerking og utløst handling først etter klikk og innlogging.
6. Implementer og test webhook-signaturverifisering, idempotens, synkronisering av betalte rettigheter og periodisering før medlemskap kan gis.
7. Test feiltilstander, tilbakebetaling, oppsigelse, dvale, lokal moms/avgift, betalingsmodellen med bruksterskel, og personvern.
8. Live-modus, produksjonsdeploy og faktiske belastninger er **ikke tillatt** i PL-055.

## Viktige begrensninger

Dette er en **kodebase for integrasjon**, ikke en fungerende offentlig betalingsløsning. Ingen ruter er montert, ingen nøkler er lagt inn og ingen produkter/priser er opprettet. Modulen tildeler ikke rettigheter etter Checkout; webhooks må bygges først. Dagens ønskede modell (betaling ved slutten av periode dersom bruksterskel er nådd) er ikke det samme som standard forhåndsbetalt Stripe-abonnement og må spesifiseres før aktivering. Ingen faktiske betalingsløfter skal gis til besøkende.

## Sikkerhet

Aldri lagre API-hemmeligheter i GitHub, HTML eller JS for nettleseren. Bare `sk_test_` aksepteres. Kundekoblingen eies av autentisert bruker og en serverprivilegert tabell. Gi ikke medlemsfordeler basert på `?checkout=success` alene. Testmiljø må holdes isolert fra produksjon.

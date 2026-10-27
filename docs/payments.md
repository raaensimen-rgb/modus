# MODUS — betalingsoppsett

Status: prissiden og koblingen til Stripe Payment Links/kundeportal er implementert.
Stripe-konto «Modus» er tilkoblet i testmodus. To produkter, fire gjentakende priser, fire Payment Links og en kundeportal er opprettet i sandbox. Ingen ekte abonnementer eller live-betalingslenker er opprettet.
Det er ingen automatisk betalt medlemstilgang. Salg er derfor stengt.

## Planer som skal opprettes når konto er tilkoblet

| Produkt | Intervall | Valuta | Beløp i øre | Pris til kunden |
| --- | --- | --- | --- | --- |
| Modus+ | month | nok | 7900 | 79 kr/mnd |
| Modus+ | year | nok | 79000 | 790 kr/år |
| Modus Studio | month | nok | 12900 | 129 kr/mnd |
| Modus Studio | year | nok | 129000 | 1 290 kr/år |

Dette er foreslåtte sluttpriser til forbruker inklusive eventuell mva. Avklar selgeridentitet og riktig avgiftsoppsett før aktivering; ikke legg avgift oppå oppgitt sluttpris. Ingen prøveperiode eller oppstartsavgift er lovet.

## Neste steg med Stripe-tilkoblingen

1. Kontroller at tilkoblet Stripe-konto er brukerens riktige mottakerkonto, og om den er test eller live. Ikke be om API-nøkler i chat eller kildekode.
2. Opprett eller gjenbruk to produkter og fire gjentakende priser som over. Bekreft priser i Stripe før linker settes inn.
3. Lag én Payment Link per pris. Fast antall 1, ingen kundestyrt mengde. La Stripe vise tilgjengelige betalingsmåter. Ikke lov Vipps, Apple Pay eller andre før kontoens støtte er kontrollert.
4. Sett opp kvitteringer, bekreftet supportkontakt, kundeportal med oppsigelse av videre fornyelse og sperre/videresending for eksisterende abonnement. Opprett en offentlig portal-innloggingslenke. Ikke lag en felles kundespesifikk portal-sessionlenke.
5. Legg de fire offentlige buy.stripe.com-lenkene og portal-lenken inn i dist/membership-config.js. Ikke legg inn hemmelige nøkler. Testlenker åpnes ikke som live kjøp.
6. Implementer ekte konto og medlemstilgang før salg: serververifisert brukeridentitet, verifiserte Stripe-webhooks med signatur, idempotent håndtering av checkout/subscription/invoice-hendelser, oppdatert medlemsstatus ved betaling/utløp/oppsigelse, og serverbeskyttet innhold. En retur-URL, browser-localStorage, skjult HTML eller et URL-parameter skal aldri gi medlemstilgang. Oppgraderinger må håndtere eksisterende abonnement, ikke opprette dobbeltkjøp.
7. Produser og kontroller innholdet som loves i hvert betalt nivå. Legg inn faktiske vilkår, personvern, selgerkontakt og informasjon om angrerett. Dette er ikke generert som juridisk fasit her.
8. Test i Stripe-testmodus fra betaling til tilgang, fornyelse, mislykket betaling, oppsigelse og gjenoppretting. Verifiser at utlogging og anonym forespørsel ikke kan lese beskyttet innhold.
9. Først når dette er ferdig: sett contentReady/accessReady for riktige planer og salesOpen til true. Sett relative vilkårs-/personvernbaner og verifisert supportEmail. Oppdater statiske tekster og planmerker på prissiden fra forhåndsvisning til lansert. Test live-beløp og lenker før publisering.

## Implementerte kontroller

- Betalingslenker kommer kun fra sporet konfigurasjon, aldri fra URL-parametre.
- Kun HTTPS til eksakt buy.stripe.com godtas; kun billing.stripe.com/p/login/... for portal.
- Testlenker, brukernavn/passord i URL, eksterne domener og script-URL-er avvises.
- Salg forblir lukket uten eksplisitt lanseringsstatus, innhold, tilgang, portal, support og vilkårsbaner.
- Nettstedet håndterer ingen kortdata. Stripe håndterer kassen når en reell link aktiveres.
- Prissiden oppretter ikke medlemsstatus etter besøk eller retur fra betaling.

Kilder: https://docs.stripe.com/no-code/subscriptions, https://docs.stripe.com/no-code/customer-portal, https://docs.stripe.com/payments/checkout/limit-subscriptions


## Bekreftet testoppsett 26.10.2026

Stripe-konto: acct_1UUnhWFEV9AtzQfc, livemode=false. Brukeren valgte testkonto.

| Plan | Pris-ID | Betalingslenke-ID |
| --- | --- | --- |
| Plus måned | price_1UUno4FEV9AtzQfc3tKbyGWF | plink_1UUnq5FEV9AtzQfc31ByipTG |
| Plus år | price_1UUnoNFEV9AtzQfcKyGB3Xtx | plink_1UUnqDFEV9AtzQfc7Xz6k9dw |
| Studio måned | price_1UUnoUFEV9AtzQfcqCLKbLHy | plink_1UUnqLFEV9AtzQfcglGwEjVu |
| Studio år | price_1UUnpIFEV9AtzQfcwXPrYPVy | plink_1UUnqTFEV9AtzQfcFd5RX2ly |

Produkter: prod_VVpTpKMKBCAd4j (Plus) / prod_VVpTq3QX5GnsF7 (Studio).
Portal: bpc_1UUnpQFEV9AtzQfcfuylcbha. Fakturahistorikk, oppdatering av betalingsmåte og oppsigelse ved periodeslutt er aktivert. Planbytte er ikke aktivert.
Testkassene finnes på /betaling-test.html (noindex). De er separate fra live-config, har kun test_ URL-er og en tydelig testbekreftelse. Managed Payments er slått av for disse fire testlenkene; kontoinnstillingen er ikke endret. Ingen automatic_tax er slått på.

Testet: opprettede beløp, intervaller, valutakode og livemode i API-respons; prissidens måned/år-valg, lukket kjøpsstatus og testlenkenes sikkerhet. Webhook/entitlement/fornyelse er ikke testet eller implementert, og ingen testbetaling er gjennomført av agenten.

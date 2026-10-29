# MODUS Dvale – abonnementspolicy (foreløpig, ikke aktiv)

**Mål:** Etter 30 dager (30 x 24 timer) uten innlogget, bevisst brukeraktivitet skal automatisk fornyelse være av. Gjelder MODUS Elev, MODUS+ og Studio, både måned og år.

## Regler
1. Aktivitet telles fra serverregistrert, bevisst handling i innlogget økt. Bakgrunnsforespørsler, fakturering og e-poståpning teller ikke.
2. Etter 30 dager uten aktivitet får medlemskapet status **dvale**. Stopp neste fornyelse hos betalingsleverandøren – ikke bare i en lokal database.
3. Betalt tilgang beholdes ut allerede betalt periode. Spesielt får årsabonnenter bruke resten av året uten å bli belastet på nytt.
4. På fornyelsesdato kontrollerer en serverstyrt betalingsvakt siste aktivitet og oppsigelser. Ved dvale eller oppsigelse: ingen ny belastning. Ikke stol kun på en nattlig jobb eller klientkode.
5. Oppsigelse kan gjøres når som helst, stopper videre fornyelse umiddelbart og bekreftes skriftlig. Betalt tilgang varer ut perioden, med forbehold om lovfestede rettigheter.
6. Gjenåpning før betalt periode er slutt gir tilgang uten nytt trekk. Automatisk videre fornyelse krever ny, tydelig godkjenning.
7. Gjenåpning etter utløpt periode krever eksplisitt nytt kjøp og starter ny måneds-/årsperiode hos betalingsleverandøren. En innlogging alene kan aldri utløse ny belastning.
8. Læringsprogresjon og gratis konto bevares i henhold til personvernerklæringen.
9. Varsel før dvale er ønskelig, men manglende e-postlevering må aldri føre til trekk som bryter regelen.

## Data, sikkerhet og tekniske krav
- Serverlagrede felt: abonnements-ID, bruker-ID, plan, faktureringsperiode, siste kvalifiserte aktivitet, betalt-til-dato, oppsigelsestidspunkt og dvaletilstand.
- Minimér aktivitetsdata; ikke bygg et detaljert sporingssystem. Informer om behandlingsgrunnlag og lagringstid.
- Fornyelser må ha låsing, idempotens, kontroll på leverandørnivå og avstemming mot betalingswebhooks. Test samtidige hendelser rundt datoer, forsinkede jobber og feil i betaling.
- Sørg for at Stripe faktisk stanser fremtidige trekk. Pauset innkreving er ikke nødvendigvis samme tilstand som avsluttet abonnement eller opphørt fakturering. Avtalebetaling må ikke åpnes før dette er korrekt løst.
- Policylogikken ligger i lib/subscription-dormancy.cjs med tester, men utfører INGEN betalingsoperasjoner.
- Kjøp og dvale er ikke operative per nå. En serverkobling for aktivitet, oppsigelse, dvale, betaling og gjenaktivering må bygges og testes før lansering. lifecycleReady må forbli false inntil da.

## Juridisk kvalitetssikring før salg
Kontroller norske regler om oppsigelse, angrerett, forskuddsbetaling, personvern og tydelig informasjon før kjøp. Betalte årsperioder må ikke forkortes uten at avtalevilkår og lov gir grunnlag for det. Brukervilkår skal opplyse om fornyelse, dvale, gjenåpning, pris og eventuelle refusjonsrettigheter.

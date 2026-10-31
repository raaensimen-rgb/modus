# PL-100 – piano QA handoff (Draft PR #29)

Scope: Teorirommet (`theory.js`), MODUS Jam (`app.js`), Harmoni
(`chord-tool.js`), Norwegian F03 and the generic teaching demonstration
(`dist/f03-atelier.js`, `dist/undervisning.js`). The teaching assets are maintained
in dist because no root source/generator exists. Other dist output is generated
by the normal build and is not committed for this change.

All interactive keyboards use `piano-interaction.js`/`.css`. Scheduled highlights
read AudioContext.currentTime and the actual source start/end windows; overlapping
notes remain independent. Manual mouse/pointer, multitouch and keyboard playback
reuse the page's existing context and samples. Focus a key, use Left/Right or
Home/End to move, and hold Enter/Space to play. Key release/cancellation, lost
capture, blur, hidden page, audio suspension, stop and rerender cancel held notes
and invalidate unfinished sample loads. Reduced motion keeps the active outline
without key movement.

A temporary label is placed on the actual sounding MIDI key (including chromatic
notes outside the selected scale); static tonic fill remains independent. Jam
includes the C6 endpoint because its existing voicing algorithm can sound MIDI84.
The sound/voicing algorithm itself is unchanged. Bass and drums do not animate
piano keys. Hidden F03 ear-training answers remain hidden during playback; answered
questions, interval demonstrations and manually chosen notes use the keyboard.

Existing defects corrected during review: pointer IDs used as MIDI numbers;
expired visual events retained forever; asynchronous notes starting after release;
unreachable stop action while the listen button was disabled; manual Space also
triggering Jam transport; and failed teaching sample loads being cached forever.

## Validation

- Run `npm run build` and `npm test` (24 checks, including the new deterministic
  piano lifecycle regression suite).
- `npm run test:browser` runs the existing release checks and new piano checks.
  GitHub Actions runs both suites in Chromium and WebKit at 1440 and 375 CSS px,
  Norwegian and English where available. F03/teaching are Norwegian-only; the
  existing English holding page is unchanged.
- New browser checks cover actual playback controls, F replacing the tonic label
  on a played F, tonic fill preservation, Enter/Space, multitouch cancellation,
  key changes, reduced motion, page overflow and hidden ear-training answers.
- Local browser installation failed because the downloaded browser ZIP was empty;
  browser results must therefore be obtained from GitHub Actions, not claimed
  from this local environment.

## QA-07 visual/listening pass

Use an isolated Cloudflare Preview of the exact PR head, not production. Check
scale, interval, chord and cadence playback in Teorirommet; multiple grooves,
acoustic/electric piano and note/interval map labels in Jam; inversions and full
progressions in Harmoni; and both teaching demonstrations. Confirm key movement,
note spelling, root marker, natural audio tail and manual chords on desktop and
375 px. Repeat with reduced motion and touch. No new piano is added to the Dorian
lesson or static article illustrations, which contain no playable keyboard.

Merge and production publishing are explicitly outside this delivery.

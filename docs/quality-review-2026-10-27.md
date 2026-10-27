# MODUS quality review — 27 October 2026

## Changes

- Theory-to-backing-track links now carry the actual selected cadence or chord, preserving enharmonic root spellings. Intervals open a tonic-based practice setup.
- Language switches use the current controls rather than stale URL parameters. Theory topic, key, interval, chord quality and cadence survive switching languages; workshop edits and current jam settings travel with the switch.
- Cancelling a jam while samples load prevents delayed playback. Space on links, editable content and display-menu summaries no longer triggers the jam shortcut.
- Both language codes are visible in high-contrast mode.
- Mobile layouts keep chord cards within their panels and piano keyboards within their own horizontal scroll areas. Scale and piano scroll areas are keyboard-focusable and labelled.
- Aeolian and Phrygian dominant descriptions are more precise. The first-improvisation article now describes both the triad and seventh-chord options.

## Verification

- Static checks cover 38 pages (19 per language), consistent menus, active-page markers, local links and routed theory hashes, unique IDs, visible translated text, CSS assets and all required instrument samples.
- Both languages pass the progression suite: loops of 1–8 bars in five grooves, nine scales in 12 roots, chord qualities and voicings, six Dorian lessons in 12 roots, and local saves.
- Additional checks cover guitar chord tones and piano inversions in 12 roots, actual transfer of all three cadences and all eight chord qualities, decoded MIDI tempo/meter/note-offs/bar length, and cancellation during sample loading.
- Browser checks confirm instrument loading and playback state, D-minor cadence transfer, edited controls surviving an English-to-Norwegian switch, and all 38 pages in three display themes at a 320 px iframe viewport without page-level horizontal overflow.

## Limits and remaining launch work

Browser QA uses Chromium and simulated narrow viewports, not a physical phone or Safari. Audio playback was checked through its UI state; subjective sound quality still needs listening on the owner's devices. Memberships remain a preview with test-only payment links. Live authentication, entitlement enforcement and live billing are outside this review.

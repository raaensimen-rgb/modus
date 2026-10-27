# Article scope — 27 October 2026

The user explicitly requested articles limited to topics he can explain and quality-check. Do not treat the whole six-year study plan as proof of mastered content. The original competence documents could not be retrieved in the preceding discussion; no new formal level assessment was made.

This expansion stays with familiar scales and modes, triads and sevenths, diatonic harmony, chord-tone targeting, elementary voice-leading examples and the previously discussed 7/8 groupings. It adds no advanced orchestration, counterpoint curriculum or broad claims of aural mastery.

## New articles

- `bygg-akkorder-i-en-toneart`: triads in G major, Roman numerals and simple transposition; bounded to the user's familiar G major/E minor material.
- `ett-skalakart-nye-maltoner`: explicitly reflects his explanation of one connected scale pattern with changing chord-tone targets, rather than requiring four unrelated physical maps over four chords.
- `dorisk-og-eolisk`: parallel comparison with a fixed tonic and one changed sixth; grounded in his stated command of modes across keys.

All ten earlier articles receive a focused practical section. Existing quiz answers, article IDs and stored completions are preserved. New articles receive three questions each in both languages.

## Factual checks

The examples were checked against their spelled pitches and intervals. Reference checks:

- https://musictheory.pugetsound.edu/mt21c/DiatonicChordsInMajor.html
- https://viva.pressbooks.pub/openmusictheory/chapter/diatonic-modes/
- https://viva.pressbooks.pub/openmusictheory/chapter/modal-schemas/

These are reference checks, not claims that the user has completed those external courses. The article explanations and diagrams are original MODUS material.

## Integration

13 articles and 39 quiz questions per language. All article IDs are supported by client progress caches and the protected Supabase progress table. The remote schema change is `allow_new_music_articles`; the SQL snapshot is `supabase/schema/quiz-progress.sql`.

The English SVG renderer now uses XML parsing so case-sensitive SVG elements such as `radialGradient` retain valid closing tags. XML parsing is included in the structure audit. Article images have a new version query to avoid caching the formerly invalid English SVGs.

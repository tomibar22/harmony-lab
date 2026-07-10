# Harmony Lab — working rules

Hebrew interactive adaptation of *Harmony & Voice Leading* (Aldwell/Schachter),
one unit at a time. RTL, React 19 + Vite + TypeScript, VexFlow 5, Tone.js.

## Hard rules
- NEVER translate or reproduce the book's prose. Write original Hebrew that
  teaches the same concepts in the same pedagogical order.
- Musical examples must be public-domain works, re-engraved from the notes
  themselves (verify transcriptions carefully — never guess bars you don't know).
- Every notated example must be playable; every playback must highlight notes.
- Scale degrees render via the `Deg` component (number + caret drawn by CSS),
  never the Unicode combining caret U+0302 inside plain text (it misaligns).
- Enharmonics: compare by pitch class, never string equality.
- Hebrew degree names: טוניקה, סופרטוניקה, מדיאנטה, סובדומיננטה, דומיננטה,
  סובמדיאנטה, צליל מוביל (במינור טבעי: סוּבּטוניקה).

## Structure
- `src/components/` — shared UI (Score, Keyboard, PlayButton, Deg, Quiz, …)
- `src/engine/audio.ts` — Tone.js playback with highlight callbacks
- `src/units/unitNN/` — one lesson per book unit; register in `src/units/registry.ts`
- Adding a unit must not require touching other units.

## Deploy
Own git repo → GitHub (tomibar22/harmony-lab) → Vercel auto-deploy.
Commit + push after every working change (user tests on the deployed version).

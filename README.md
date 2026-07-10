# מעבדת הרמוניה · Harmony Lab

עיבוד עברי אינטראקטיבי, יחידה אחר יחידה, של המהלך הפדגוגי בספר
*Harmony & Voice Leading* (אלדוול, שכטר וקדוולדר, מהדורה 5).

## What the tool teaches
Classical tonal harmony from the ground up — keys, scales, scale degrees,
stable vs. active tones, key signatures, minor forms, modes — as an
interactive, audible, Hebrew-language experience.

## The copyright stance (important)
- The book's **text is never translated or reproduced**. Every explanation
  here is an original Hebrew adaptation of the underlying (uncopyrightable)
  concepts, following the book's pedagogical arc.
- The **musical examples are public domain** (Mozart, Handel, Brahms…) and are
  re-engraved with VexFlow and re-sequenced with Tone.js.

## Musical concept it reveals
That a key is a *system of directed relationships* around a tonic — not a
collection of notes. Every widget lets you *hear* the pull: active tones
resolving, half steps intensifying, minor forms trading smoothness for a
leading tone.

## Core interaction design
- Every notated example is playable, with synchronized note highlighting.
- Scale degrees are first-class UI objects (number + caret, name, tendency).
- Units end with self-checking drills (key signatures, relatives, degrees).
- Progress persists in localStorage; glossary terms cross-link between units.

## Tech approach
- Vite + React 19 + TypeScript
- VexFlow 5 for engraving, Tone.js for audio
- No backend; deployed on Vercel

## Working process (one unit at a time)
1. Read the unit in the book → extract the concept sequence.
2. Write an original Hebrew lesson (`src/units/unitNN/`).
3. Reuse/extend shared components (`src/components/`).
4. Verify in browser (audio, engraving, RTL, both themes), then commit+push.

## Run
```bash
pnpm install
pnpm dev   # port 5176
```

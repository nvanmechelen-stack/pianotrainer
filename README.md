# Piano Trainer

A small web app for learning jazz piano voicings, built with Vite, React, TypeScript and Tailwind CSS, hosted on Firebase Hosting.

Tabs:

- **Home**: a welcome page explaining each section, a suggested practice path and the key colours.
- **Explorer**: pick a root, chord type (m7, 7, maj7, m7♭5, 7alt) and voicing (Closed with inversions, Basic Shell, Rootless A/B, Drop-2) and see it on the keyboard.
- **Flashcards**: rounds of 20 assignments ("Play F7 – Rootless Form B"). Try it on your piano, reveal the solution, then mark it *Got it* or *Practice again* (the card comes back a few cards later, until you get it right; the counter shows how many repeats are left). Keyboard: Space = show solution, → = got it, ← = practice again.
  - *On screen* mode (for practising away from the piano): tap the keys to build the voicing, then **Check**. The shape must be exact (notes, order and spacing) but may be in any octave; the bass of a rootless voicing is optional. Tap a key again, **Undo** (⌫) or **Clear** (Esc) to correct; Enter = check.
- **ii-V-I Flow**: ii–V–I progressions in major (m7–7–maj7) or minor (m7♭5–7alt–m6/9), with rootless voicings (A → B → A), shells or closed chords that move as little as possible. Default order: each key a whole step down, the I chord turning into the next ii (Cmaj7 → Cm7), six keys per round; the next round starts on E♭ for the other six. Also circle of fourths, chromatic, random or one key. *Listen & watch* plays it in time (tempo, metronome, bass note; 1 bar per chord or 2 beats, the I twice as long); *Practise* lets you play each chord at the piano or on screen. Markers show common tones (=) and how far each voice moves (↓½, ↑1).
- **Speed Trainer**: coming soon.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # theory unit tests
npm run build    # production build in dist/
```

## Project layout

- `src/theory/`: music theory (note spelling, chord types, voicings, keyboard range). Framework-free, so every tab can reuse it.
- `src/components/PianoKeyboard.tsx`: the reusable SVG keyboard (highlighted keys with labels).
- `src/audio/piano.ts`: a small Web Audio synth for playing notes and chords.
- `src/flashcards/deck.ts`: card pool, rounds and scoring for the Flashcards tab (framework-free, tested).
- `src/flow/progression.ts`: key orders, ii–V–I progressions and voice-leading placement for the ii-V-I Flow tab (framework-free, tested).
- `src/pages/`: one component per tab.

## Deployment

GitHub Actions deploy to Firebase Hosting:

- push to `main` deploys to the live site;
- every pull request gets a preview URL.

The Firebase project ID is `pianotrainer-8e3da` (set in `.firebaserc` and both workflows).

One-time setup: create a service account key: easiest is `npx firebase-tools init hosting:github`, which creates the `FIREBASE_SERVICE_ACCOUNT_…` secret for you. Rename it to `FIREBASE_SERVICE_ACCOUNT`, or create that secret yourself with the JSON key of a service account that has the *Firebase Hosting Admin* role.

Manual deploy: `npm run build && npx firebase-tools deploy --only hosting`.

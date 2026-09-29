# Piano Trainer

A small web app for learning jazz piano voicings, built with Vite, React, TypeScript and Tailwind CSS, hosted on Firebase Hosting.

Tabs:

- **Explorer**: pick a root, chord type (m7, 7, maj7, m7♭5, 7alt) and voicing (Basic Shell, Rootless A/B, Drop-2) and see it on the keyboard.
- **Flashcards**, **ii-V-I Flow**, **Speed Trainer**: coming soon.

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
- `src/pages/`: one component per tab.

## Deployment

GitHub Actions deploy to Firebase Hosting:

- push to `main` deploys to the live site;
- every pull request gets a preview URL.

One-time setup:

1. Check the project ID in the Firebase console (Project settings). If it isn't `pianotrainer`, update `.firebaserc` and add a repository variable `FIREBASE_PROJECT_ID` (Settings → Secrets and variables → Actions → Variables).
2. Create a service account key: easiest is `npx firebase-tools init hosting:github`, which creates the `FIREBASE_SERVICE_ACCOUNT_…` secret for you. Rename it to `FIREBASE_SERVICE_ACCOUNT`, or create that secret yourself with the JSON key of a service account that has the *Firebase Hosting Admin* role.

Manual deploy: `npm run build && npx firebase-tools deploy --only hosting`.

// Per-page <title> and meta description. The app is a single page, so these are set when the
// route changes; index.html carries the Home values (and the Open Graph tags) for crawlers.

export const SITE_NAME = 'Piano Trainer'
export const SITE_URL = 'https://pianotrainer-8e3da.web.app'

export interface PageMeta {
  /** "Page Name — Site Name", under 60 characters. */
  title: string
  /** 150–160 characters. */
  description: string
}

export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: `Learn Jazz Piano Voicings — ${SITE_NAME}`,
    description:
      'Learn jazz piano voicings step by step: explore shells, rootless and drop-2 shapes, drill them with flashcards and practise smooth ii-V-I voice leading.',
  },
  '/explorer': {
    title: `Voicing Explorer — ${SITE_NAME}`,
    description:
      'See how every jazz voicing is built: pick a root, chord type and shape, and read each key as a 3, 7 or 9 on the keyboard, with sound and a short explanation.',
  },
  '/flashcards': {
    title: `Chord Flashcards — ${SITE_NAME}`,
    description:
      'Drill jazz piano voicings with flashcards: play the chord at your piano or tap it on screen, check yourself, and see which shapes need some more practice.',
  },
  '/flow': {
    title: `ii-V-I Flow — ${SITE_NAME}`,
    description:
      'Practise ii-V-I progressions in every key with closed, rootless or shell voicings. Watch how each voice moves, play along in time, or play each chord yourself.',
  },
  '/speed': {
    title: `Speed Trainer — ${SITE_NAME}`,
    description:
      'Find jazz piano voicings against the clock: sprint through 10 chords or play as many as you can in one minute, beat your record and spot your slowest chords.',
  },
}

export const NOT_FOUND: PageMeta = {
  title: `Page Not Found — ${SITE_NAME}`,
  description:
    'This page does not exist. Head back to Piano Trainer to explore jazz piano voicings, drill chord flashcards and practise ii-V-I voice leading in every key.',
}

export function applyPageMeta({ title, description }: PageMeta): void {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
}

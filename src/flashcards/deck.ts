import { CHORD_TYPES, type ChordId, rootFor } from '../theory/chords'
import { noteName } from '../theory/notes'
import { describeVoicing, VOICING_STYLES, type VoicingStyle } from '../theory/voicings'

export interface Card {
  rootPc: number
  chordId: ChordId
  style: VoicingStyle
  variant: number
}

export interface DeckSettings {
  chords: ChordId[]
  roots: number[]
  /** Adds the 1st–3rd inversions of the closed chord. */
  inversions: boolean
  /** Adds Basic Shell, Rootless A/B and Drop-2. */
  voicings: boolean
}

export const ROUND_SIZE = 20
export const ALL_ROOTS = Array.from({ length: 12 }, (_, i) => i)
/** C, D, F, G, B♭: few accidentals. */
export const EASY_ROOTS = [0, 2, 5, 7, 10]

export const DEFAULT_SETTINGS: DeckSettings = {
  chords: ['m7', '7', 'maj7'],
  roots: ALL_ROOTS,
  inversions: false,
  voicings: false,
}

export const cardKey = (c: Card) => `${c.rootPc}|${c.chordId}|${c.style}|${c.variant}`

/** Every card the settings allow. Root-position closed chords are always included. */
export function cardPool(s: DeckSettings): Card[] {
  const forms: { style: VoicingStyle; variant: number }[] = [{ style: 'closed', variant: 0 }]
  if (s.inversions) for (const v of [1, 2, 3]) forms.push({ style: 'closed', variant: v })
  const pool: Card[] = []
  for (const chordId of s.chords)
    for (const rootPc of s.roots) {
      const extra = s.voicings
        ? VOICING_STYLES.filter((st) => st.id !== 'closed').flatMap((st) =>
            st.variants(CHORD_TYPES[chordId]).map((_, variant) => ({ style: st.id, variant })),
          )
        : []
      for (const f of [...forms, ...extra]) pool.push({ rootPc, chordId, ...f })
    }
  return pool
}

export function cardTitle(c: Card): { symbol: string; name: string; detail: string } {
  const chord = CHORD_TYPES[c.chordId]
  return {
    symbol: noteName(rootFor(chord, c.rootPc)) + chord.symbol,
    ...describeVoicing(c.chordId, c.style, c.variant),
  }
}

export interface QueueItem {
  card: Card
  /** A card that came back after "Practice again". */
  retry: boolean
}

export interface Round {
  queue: QueueItem[]
  /** Original cards answered so far (out of ROUND_SIZE). */
  answered: number
  /** Original cards answered "Got it" on the first try. */
  correct: number
  /** "Practice again" count per card key. */
  misses: Record<string, number>
}

type Rng = () => number

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** ROUND_SIZE cards; without repeats when the pool is large enough, never the same card twice in a row. */
export function newRound(pool: Card[], rng: Rng = Math.random): Round {
  const cards: Card[] = []
  while (pool.length && cards.length < ROUND_SIZE) {
    let batch = shuffle(pool, rng)
    const last = cards[cards.length - 1]
    if (last && batch.length > 1 && cardKey(batch[0]) === cardKey(last)) batch = [...batch.slice(1), batch[0]]
    cards.push(...batch.slice(0, ROUND_SIZE - cards.length))
  }
  return { queue: cards.map((card) => ({ card, retry: false })), answered: 0, correct: 0, misses: {} }
}

/** Handle "Got it" (true) or "Practice again" (false) for the card at the head of the queue. */
export function answer(round: Round, gotIt: boolean, rng: Rng = Math.random): Round {
  const [head, ...rest] = round.queue
  if (!head) return round
  const next: Round = {
    queue: rest,
    answered: round.answered + (head.retry ? 0 : 1),
    correct: round.correct + (!head.retry && gotIt ? 1 : 0),
    misses: round.misses,
  }
  if (!gotIt) {
    const key = cardKey(head.card)
    next.misses = { ...round.misses, [key]: (round.misses[key] ?? 0) + 1 }
    // Comes back after 3–5 other cards (or at the end of the round).
    const at = Math.min(rest.length, 3 + Math.floor(rng() * 3))
    next.queue = [...rest.slice(0, at), { card: head.card, retry: true }, ...rest.slice(at)]
  }
  return next
}

export const isFinished = (r: Round) => r.queue.length === 0

/** Cards that needed practice, hardest first. */
export function hardestCards(r: Round): { card: Card; misses: number }[] {
  return Object.entries(r.misses)
    .map(([key, misses]) => {
      const [rootPc, chordId, style, variant] = key.split('|')
      return {
        card: { rootPc: Number(rootPc), chordId: chordId as ChordId, style: style as VoicingStyle, variant: Number(variant) },
        misses,
      }
    })
    .sort((a, b) => b.misses - a.misses)
}

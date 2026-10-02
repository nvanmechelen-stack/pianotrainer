import { type Card, cardKey, type DeckSettings } from '../flashcards/deck'

/** sprint: 10 chords, lowest total time wins. minute: as many chords as possible in 60 seconds. */
export type Format = 'sprint' | 'minute'
export type AnswerMode = 'piano' | 'screen'

export const SPRINT_SIZE = 10
export const MINUTE_MS = 60_000
/** Added for a chord marked wrong at the piano. */
export const PENALTY_MS = 3_000

export interface Attempt {
  card: Card
  /** Time from the chord appearing to the right answer (or "Done" at the piano). */
  ms: number
  /** Marked wrong at the piano (costs PENALTY_MS). */
  wrong: boolean
}

export interface Result {
  format: Format
  attempts: Attempt[]
  /** sprint: total time in ms, penalties included. minute: chords right. */
  score: number
}

export const penaltyMs = (attempts: Attempt[]) => attempts.filter((a) => a.wrong).length * PENALTY_MS

/** Time used so far, penalties included. */
export const elapsedMs = (attempts: Attempt[], currentMs = 0) =>
  attempts.reduce((sum, a) => sum + a.ms, 0) + penaltyMs(attempts) + currentMs

export function isFinished(format: Format, attempts: Attempt[], currentMs = 0): boolean {
  return format === 'sprint' ? attempts.length >= SPRINT_SIZE : elapsedMs(attempts, currentMs) >= MINUTE_MS
}

export function scoreOf(format: Format, attempts: Attempt[]): number {
  if (format === 'sprint') return elapsedMs(attempts)
  // Only chords finished within the minute count.
  let used = 0
  let right = 0
  for (const a of attempts) {
    used += a.ms + (a.wrong ? PENALTY_MS : 0)
    if (used > MINUTE_MS) break
    if (!a.wrong) right++
  }
  return right
}

/** Lower time wins a sprint; more chords win a minute. */
export const isBetter = (format: Format, score: number, best: number | undefined) =>
  best === undefined || (format === 'sprint' ? score < best : score > best)

/** The slowest chords of a round, slowest first. */
export const slowest = (attempts: Attempt[], n = 3) => [...attempts].sort((a, b) => b.ms - a.ms).slice(0, n)

/** One personal record per format, answer mode and chord selection. */
export function recordKey(format: Format, mode: AnswerMode, s: DeckSettings): string {
  const chords = [...s.chords].sort().join(',')
  const roots = [...s.roots].sort((a, b) => a - b).join(',')
  return `${format}|${mode}|${chords}|${roots}|${s.inversions ? 'inv' : ''}|${s.voicings ? 'voi' : ''}`
}

/** "8.4 s", "1:02.5". */
export function formatMs(ms: number): string {
  const s = Math.max(0, ms) / 1000
  if (s < 60) return `${s.toFixed(1)} s`
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`
}

export const attemptKey = (a: Attempt) => cardKey(a.card)

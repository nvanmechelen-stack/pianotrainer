import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Card } from '../flashcards/deck'
import {
  type Attempt,
  elapsedMs,
  formatMs,
  isBetter,
  isFinished,
  MINUTE_MS,
  PENALTY_MS,
  recordKey,
  scoreOf,
  slowest,
  SPRINT_SIZE,
} from './session'

const card: Card = { rootPc: 0, chordId: 'maj7', style: 'closed', variant: 0 }
const at = (ms: number, wrong = false): Attempt => ({ card: { ...card, rootPc: ms % 12 }, ms, wrong })

describe('sprint', () => {
  it('ends after 10 chords and scores the total time with penalties', () => {
    const attempts = Array.from({ length: SPRINT_SIZE }, (_, i) => at(2000, i === 3))
    expect(isFinished('sprint', attempts.slice(0, 9))).toBe(false)
    expect(isFinished('sprint', attempts)).toBe(true)
    expect(scoreOf('sprint', attempts)).toBe(20_000 + PENALTY_MS)
  })
})

describe('one minute', () => {
  it('counts right chords finished within the minute; penalties eat time', () => {
    const attempts = [at(10_000), at(10_000, true), at(10_000), at(10_000), at(10_000), at(9_000)]
    // 59 s used plus a 3 s penalty: the last chord ends after the minute.
    expect(elapsedMs(attempts)).toBe(62_000)
    expect(isFinished('minute', attempts)).toBe(true)
    expect(scoreOf('minute', attempts)).toBe(4)
    expect(isFinished('minute', [at(30_000)], MINUTE_MS - 30_001)).toBe(false)
  })
})

describe('records and stats', () => {
  it('compares scores per format', () => {
    expect(isBetter('sprint', 30_000, undefined)).toBe(true)
    expect(isBetter('sprint', 30_000, 32_000)).toBe(true)
    expect(isBetter('sprint', 33_000, 32_000)).toBe(false)
    expect(isBetter('minute', 12, 11)).toBe(true)
    expect(isBetter('minute', 11, 11)).toBe(false)
  })

  it('keys records by format, mode and chord selection, ignoring order', () => {
    const a = recordKey('sprint', 'screen', { ...DEFAULT_SETTINGS, chords: ['m7', '7'] })
    const b = recordKey('sprint', 'screen', { ...DEFAULT_SETTINGS, chords: ['7', 'm7'] })
    expect(a).toBe(b)
    expect(recordKey('minute', 'screen', DEFAULT_SETTINGS)).not.toBe(recordKey('sprint', 'screen', DEFAULT_SETTINGS))
    expect(recordKey('sprint', 'piano', DEFAULT_SETTINGS)).not.toBe(recordKey('sprint', 'screen', DEFAULT_SETTINGS))
  })

  it('finds the slowest chords and formats times', () => {
    expect(slowest([at(1000), at(5000), at(3000), at(4000)]).map((a) => a.ms)).toEqual([5000, 4000, 3000])
    expect(formatMs(8_420)).toBe('8.4 s')
    expect(formatMs(62_500)).toBe('1:02.5')
  })
})

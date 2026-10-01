import { describe, expect, it } from 'vitest'
import {
  answer,
  cardKey,
  cardPool,
  cardTitle,
  DEFAULT_SETTINGS,
  hardestCards,
  isFinished,
  newRound,
  repeatsLeft,
  ROUND_SIZE,
} from './deck'

// Deterministic pseudo-random numbers for repeatable tests.
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

describe('card pool', () => {
  it('has only root-position closed chords by default', () => {
    const pool = cardPool(DEFAULT_SETTINGS)
    expect(pool).toHaveLength(3 * 12)
    expect(pool.every((c) => c.style === 'closed' && c.variant === 0)).toBe(true)
  })

  it('adds inversions and voicings with the toggles', () => {
    const one = { ...DEFAULT_SETTINGS, chords: ['7' as const], roots: [0] }
    expect(cardPool({ ...one, inversions: true })).toHaveLength(4)
    // closed root pos + shell 2 + rootless 2 + drop-2 4
    expect(cardPool({ ...one, voicings: true })).toHaveLength(9)
    expect(cardPool({ ...one, inversions: true, voicings: true })).toHaveLength(12)
  })
})

describe('card titles', () => {
  it('names the assignment', () => {
    expect(cardTitle({ rootPc: 5, chordId: '7', style: 'rootless', variant: 1 })).toEqual({
      symbol: 'F7',
      name: 'Rootless Form B',
      detail: 'starting on the ♭7',
    })
    expect(cardTitle({ rootPc: 2, chordId: 'm7', style: 'closed', variant: 1 })).toEqual({
      symbol: 'Dm7',
      name: '1st inversion',
      detail: '♭3 in the bass',
    })
  })
})

describe('rounds', () => {
  it('keeps a missed repeat coming back until it is answered right', () => {
    const rng = seeded(5)
    let r = newRound(cardPool(DEFAULT_SETTINGS), rng)
    r = answer(r, false, rng)
    // Answer right until the repeat is at the head, then miss it again.
    while (!r.queue[0].retry) r = answer(r, true, rng)
    const key = cardKey(r.queue[0].card)
    r = answer(r, false, rng)
    expect(repeatsLeft(r)).toBe(1)
    expect(r.misses[key]).toBe(2)
    while (!r.queue[0].retry) r = answer(r, true, rng)
    r = answer(r, true, rng)
    expect(repeatsLeft(r)).toBe(0)
    expect(r.correct).toBe(r.answered - 1)
  })

  it('deals ROUND_SIZE cards, never the same card twice in a row', () => {
    const small = cardPool({ ...DEFAULT_SETTINGS, chords: ['m7'], roots: [0, 2, 5] })
    const r = newRound(small, seeded(7))
    expect(r.queue).toHaveLength(ROUND_SIZE)
    for (let i = 1; i < r.queue.length; i++) expect(cardKey(r.queue[i].card)).not.toBe(cardKey(r.queue[i - 1].card))
  })

  it('brings missed cards back and scores only the first try', () => {
    const rng = seeded(3)
    let r = newRound(cardPool(DEFAULT_SETTINGS), rng)
    const missed = r.queue[0].card
    r = answer(r, false, rng)
    expect(r.answered).toBe(1)
    expect(r.correct).toBe(0)
    const back = r.queue.findIndex((q) => q.retry)
    expect(back).toBeGreaterThanOrEqual(3)
    expect(back).toBeLessThanOrEqual(5)
    expect(r.queue[back].card).toEqual(missed)
    expect(repeatsLeft(r)).toBe(1)

    let steps = 0
    while (!isFinished(r) && steps++ < 100) r = answer(r, true, rng)
    expect(isFinished(r)).toBe(true)
    expect(repeatsLeft(r)).toBe(0)
    expect(r.answered).toBe(ROUND_SIZE)
    expect(r.correct).toBe(ROUND_SIZE - 1)
    expect(hardestCards(r)).toEqual([{ card: missed, misses: 1 }])
  })
})

import { describe, expect, it } from 'vitest'
import { CHORD_ORDER, CHORD_TYPES, rootFor } from '../theory/chords'
import { buildVoicing, VOICING_STYLES } from '../theory/voicings'
import { checkShape, fittingShifts } from './check'

// The on-screen keyboard: C3–G5, the smallest window every voicing fits in.
const RANGE = { low: 48, high: 79 }
// Dm7 rootless A: F3 A3 C4 E4
const DM7_A = [53, 57, 60, 64]

describe('checkShape', () => {
  it('accepts the exact shape in any octave and any tap order', () => {
    expect(checkShape(DM7_A, [64, 53, 60, 57], RANGE).correct).toBe(true)
    const up = checkShape(DM7_A, DM7_A.map((m) => m + 12), RANGE)
    expect(up.correct).toBe(true)
    expect(up.shift).toBe(12)
    expect(up.missing).toEqual([])
  })

  it('rejects the right notes in the wrong order or spacing', () => {
    // Form B of the same chord: C E F A
    expect(checkShape(DM7_A, [60, 64, 65, 69], RANGE).correct).toBe(false)
    // Same pitch classes, E dropped an octave
    expect(checkShape(DM7_A, [52, 53, 57, 60], RANGE).correct).toBe(false)
  })

  it('marks wrong keys and shows the missing ones where most notes match', () => {
    // F A C + wrong D♭ instead of E, one octave up
    const r = checkShape(DM7_A, [65, 69, 72, 73], RANGE)
    expect(r.correct).toBe(false)
    expect(r.shift).toBe(12)
    expect(r.marks).toEqual({ 65: 'correct', 69: 'correct', 72: 'correct', 73: 'wrong' })
    expect(r.missing).toEqual([76])
  })

  it('ignores a root played below a rootless voicing', () => {
    const r = checkShape(DM7_A, [50, 53, 57, 60, 64], RANGE, 2)
    expect(r.correct).toBe(true)
    expect(r.ignoredBass).toBe(50)
  })

  it('shows the whole target when nothing was played', () => {
    const r = checkShape(DM7_A, [], RANGE)
    expect(r.correct).toBe(false)
    expect(r.missing).toHaveLength(4)
  })
})

describe('on-screen keyboard range', () => {
  it('fits every voicing in some octave', () => {
    for (const id of CHORD_ORDER)
      for (const style of VOICING_STYLES)
        style.variants(CHORD_TYPES[id]).forEach((_, v) => {
          for (let pc = 0; pc < 12; pc++) {
            const notes = buildVoicing(rootFor(CHORD_TYPES[id], pc), id, style.id, v)
              .notes.filter((n) => !n.isBass)
              .map((n) => n.midi)
            expect(fittingShifts(notes, RANGE).length, `${pc} ${id} ${style.id} ${v}`).toBeGreaterThan(0)
          }
        })
  })
})

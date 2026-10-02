import { describe, expect, it } from 'vitest'
import { noteName } from '../theory/notes'
import { buildFlow, FLOW_RANGES, keySequence, moveBadge, nextRoundStart, voiceMoves } from './progression'

const names = (c: ReturnType<typeof buildFlow>[number]) =>
  c.voicing.notes
    .filter((n) => !n.isBass)
    .map((n) => noteName(n.note))
    .join(' ')

describe('key order', () => {
  it('goes down in whole steps for six keys, then the other six start on E♭', () => {
    expect(keySequence('wholeSteps', 0)).toEqual([0, 10, 8, 6, 4, 2])
    expect(nextRoundStart('wholeSteps', 0)).toBe(3)
    expect(keySequence('wholeSteps', 3)).toEqual([3, 1, 11, 9, 7, 5])
    expect(nextRoundStart('wholeSteps', 3)).toBe(0)
  })

  it('offers fourths, chromatic, random and a single key', () => {
    expect(keySequence('fourths', 0).slice(0, 4)).toEqual([0, 5, 10, 3])
    expect(keySequence('chromatic', 0).slice(0, 3)).toEqual([0, 11, 10])
    const random = keySequence('random', 7)
    expect(random[0]).toBe(7)
    expect([...random].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i))
    expect(keySequence('single', 5)).toEqual([5])
  })
})

describe('progressions', () => {
  it('builds a major ii–V–I with rootless A → B → A and the I lasting twice as long', () => {
    const flow = buildFlow({ quality: 'major', style: 'rootless', keys: [0], beatsPerChord: 4 })
    expect(flow.map((c) => c.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7'])
    expect(flow.map(names)).toEqual(['F A C E', 'F A B E', 'E G B D'])
    expect(flow.map((c) => c.beats)).toEqual([4, 4, 8])
  })

  it('turns the I into the next ii a whole step down', () => {
    const flow = buildFlow({ quality: 'major', style: 'rootless', keys: [0, 10], beatsPerChord: 4 })
    expect(flow.map((c) => c.symbol)).toEqual(['Dm7', 'G7', 'Cmaj7', 'Cm7', 'F7', 'B♭maj7'])
    // Cmaj7 A → Cm7 A: only the 3rd and 7th move, each down a half step.
    const moves = [...voiceMoves(flow[2].voicing, flow[3].voicing).values()]
    expect(moves.sort()).toEqual([-1, -1, 0, 0])
  })

  it('spells every key coherently', () => {
    const gb = buildFlow({ quality: 'major', style: 'rootless', keys: [6], beatsPerChord: 4 })
    expect(gb.map((c) => c.symbol)).toEqual(['A♭m7', 'D♭7', 'G♭maj7'])
    const cm = buildFlow({ quality: 'minor', style: 'rootless', keys: [0], beatsPerChord: 4 })
    expect(cm.map((c) => c.symbol)).toEqual(['Dm7♭5', 'G7♭9♭13', 'Cm6/9'])
    expect(cm.map(names)).toEqual(['F A♭ C G', 'F A♭ B E♭', 'E♭ G A D'])
  })

  it('picks the closest inversion for closed chords', () => {
    const flow = buildFlow({ quality: 'major', style: 'closed', keys: [0], beatsPerChord: 4 })
    expect(flow.map(names)).toEqual(['D F A C', 'D F G B', 'C E G B'])
  })

  it('starts every closed ii–V–I with the ii in root position', () => {
    const flow = buildFlow({ quality: 'major', style: 'closed', keys: keySequence('wholeSteps', 0), beatsPerChord: 4 })
    for (const c of flow.filter((c) => c.degree === 'ii')) expect(c.voicing.notes[0].interval.label).toBe('1')
    // Cmaj7 → Cm7: only the 3rd and the 7th move, each down a half step.
    expect(names(flow[2])).toBe('C E G B')
    expect(names(flow[3])).toBe('C E♭ G B♭')
    expect([...voiceMoves(flow[2].voicing, flow[3].voicing).values()].sort()).toEqual([-1, -1, 0, 0])
  })

  it('follows the keys down the keyboard without jumps', () => {
    const upperOf = (c: ReturnType<typeof buildFlow>[number]) =>
      c.voicing.notes.filter((n) => !n.isBass).map((n) => n.midi)
    const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length
    for (const quality of ['major', 'minor'] as const)
      for (const style of ['rootless', 'shell', 'closed'] as const)
        for (const start of [0, 3]) {
          const flow = buildFlow({ quality, style, keys: keySequence('wholeSteps', start), beatsPerChord: 4 })
          for (let i = 1; i < flow.length; i++) {
            const label = `${quality} ${style} ${flow[i - 1].symbol} → ${flow[i].symbol}`
            // Half or whole steps; up to a 4th where the shape changes (a closed ii back in root
            // position, or the 11 of a m7♭5 moving to the ♭13 of the 7alt).
            const limit = style === 'closed' || quality === 'minor' || flow[i].degree === 'ii' ? 5 : 2
            const moves = [...voiceMoves(flow[i - 1].voicing, flow[i].voicing).entries()].sort((a, b) => a[0] - b[0])
            // A shell's root is the bass and may leap; its 3rd and 7th must move smoothly.
            for (const [, m] of style === 'shell' ? moves.slice(1) : moves)
              expect(Math.abs(m), label).toBeLessThanOrEqual(limit)
          }
          // Six keys a whole step apart: the last ii sits clearly lower than the first.
          const iis = flow.filter((c) => c.degree === 'ii').map((c) => avg(upperOf(c)))
          expect(iis[0] - iis[iis.length - 1], `${quality} ${style}`).toBeGreaterThanOrEqual(6)
        }
  })

  it('keeps long rounds in a playable register', () => {
    for (const style of ['rootless', 'shell', 'closed'] as const)
      for (const order of ['fourths', 'chromatic', 'random'] as const) {
        const flow = buildFlow({ quality: 'major', style, keys: keySequence(order, 0), beatsPerChord: 4 })
        const notes = flow.flatMap((c) => c.voicing.notes.map((n) => n.midi))
        expect(Math.min(...notes), `${style} ${order}`).toBeGreaterThanOrEqual(FLOW_RANGES[style].low - 12)
        expect(Math.max(...notes), `${style} ${order}`).toBeLessThanOrEqual(FLOW_RANGES[style].high)
      }
  })
})

describe('badges', () => {
  it('describes moves in whole steps', () => {
    expect([0, -1, 1, 2, -3, 4].map(moveBadge)).toEqual(['=', '↓½', '↑½', '↑1', '↓1½', '↑2'])
  })
})

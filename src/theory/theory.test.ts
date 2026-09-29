import { describe, expect, it } from 'vitest'
import { CHORD_ORDER, CHORD_TYPES, rootFor } from './chords'
import { fitRange, whiteIndex } from './keyboard'
import { noteName, parseNote, transpose } from './notes'
import { buildVoicing, VOICING_STYLES } from './voicings'

const names = (root: string, chord: Parameters<typeof buildVoicing>[1], style: Parameters<typeof buildVoicing>[2], v: number) =>
  buildVoicing(parseNote(root), chord, style, v)
    .notes.filter((n) => !n.isBass)
    .map((n) => noteName(n.note))
    .join(' ')

describe('spelling', () => {
  it('spells chord tones by degree', () => {
    const spell = (root: string, id: keyof typeof CHORD_TYPES) =>
      CHORD_TYPES[id].seventhChord.map((iv) => noteName(transpose(parseNote(root), iv))).join(' ')
    expect(spell('D', 'm7')).toBe('D F A C')
    expect(spell('Eb', 'm7')).toBe('E♭ G♭ B♭ D♭')
    expect(spell('C#', 'm7')).toBe('C♯ E G♯ B')
    expect(spell('Gb', 'maj7')).toBe('G♭ B♭ D♭ F')
    expect(spell('D', 'maj7')).toBe('D F♯ A C♯')
  })

  it('picks readable roots per chord type', () => {
    expect(noteName(rootFor(CHORD_TYPES.m7, 1))).toBe('C♯')
    expect(noteName(rootFor(CHORD_TYPES.maj7, 1))).toBe('D♭')
    expect(noteName(rootFor(CHORD_TYPES.m7, 3))).toBe('E♭')
  })
})

describe('rootless voicings (Bill Evans table)', () => {
  it.each([
    ['D', 'm7', 0, 'F A C E'],
    ['D', 'm7', 1, 'C E F A'],
    ['G', '7', 0, 'B E F A'],
    ['G', '7', 1, 'F A B E'],
    ['C', 'maj7', 0, 'E G B D'],
    ['C', 'maj7', 1, 'B D E G'],
    ['D', 'm7b5', 0, 'F A♭ C G'],
    ['D', 'm7b5', 1, 'C G F A♭'],
    ['G', '7alt', 0, 'B E♭ F A♭'],
    ['G', '7alt', 1, 'F A♭ B E♭'],
  ] as const)('%s%s form %i', (root, chord, v, expected) => {
    expect(names(root, chord, 'rootless', v)).toBe(expected)
  })

  it('adds the root as bass below the voicing', () => {
    const v = buildVoicing(parseNote('D'), 'm7', 'rootless', 0)
    expect(v.notes[0].isBass).toBe(true)
    expect(noteName(v.notes[0].note)).toBe('D')
    expect(v.notes[0].midi).toBeLessThan(v.notes[1].midi)
  })
})

describe('shells and drop-2', () => {
  it('builds both shell orders', () => {
    expect(names('C', 'maj7', 'shell', 0)).toBe('C E B')
    expect(names('C', 'maj7', 'shell', 1)).toBe('C B E')
  })

  it('builds drop-2 inversions with the right bass note', () => {
    expect(names('C', 'maj7', 'drop2', 0)).toBe('C G B E')
    expect(names('C', 'maj7', 'drop2', 1)).toBe('E B C G')
    expect(names('C', 'maj7', 'drop2', 2)).toBe('G C E B')
    expect(names('C', 'maj7', 'drop2', 3)).toBe('B E G C')
  })

  it('always produces strictly ascending notes', () => {
    for (const id of CHORD_ORDER)
      for (const style of VOICING_STYLES)
        for (let v = 0; v < style.variants(CHORD_TYPES[id]).length; v++)
          for (let pc = 0; pc < 12; pc++) {
            const m = buildVoicing(rootFor(CHORD_TYPES[id], pc), id, style.id, v).notes.map((n) => n.midi)
            expect(m).toEqual([...m].sort((a, b) => a - b))
            expect(new Set(m).size).toBe(m.length)
          }
  })
})

describe('keyboard range', () => {
  it('is at least two octaves and contains every note', () => {
    for (const id of CHORD_ORDER)
      for (const style of VOICING_STYLES)
        for (let pc = 0; pc < 12; pc++) {
          const m = buildVoicing(rootFor(CHORD_TYPES[id], pc), id, style.id, 1).notes.map((n) => n.midi)
          const r = fitRange(m)
          expect(whiteIndex(r.high) - whiteIndex(r.low) + 1).toBeGreaterThanOrEqual(15)
          expect(r.low).toBeLessThan(Math.min(...m))
          expect(r.high).toBeGreaterThan(Math.max(...m))
        }
  })
})

import { INTERVALS as I, type Interval, parseNote, type SpelledNote } from './notes'

export type ChordId = 'm7' | '7' | 'maj7' | 'm7b5' | '7alt'

export interface ChordType {
  id: ChordId
  /** Short label for selectors. */
  label: string
  /** Suffix written after the root in a chord symbol. */
  symbol: string
  name: string
  /** The four tones of the basic (closed) chord, lowest first; used for drop-2. */
  seventhChord: [Interval, Interval, Interval, Interval]
  /**
   * Spelling of the 12 roots (C upwards by semitone). Chosen per chord type so the
   * chord tones read naturally: E♭m7 instead of D♯m7, but C♯m7 instead of D♭m7 (F♭).
   */
  roots: string[]
}

const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
const ALT_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export const CHORD_TYPES: Record<ChordId, ChordType> = {
  m7: {
    id: 'm7',
    label: 'm7',
    symbol: 'm7',
    name: 'Minor 7th',
    seventhChord: [I.R, I.b3, I.P5, I.b7],
    roots: MINOR_ROOTS,
  },
  '7': {
    id: '7',
    label: '7',
    symbol: '7',
    name: 'Dominant 7th',
    seventhChord: [I.R, I.M3, I.P5, I.b7],
    roots: FLAT_ROOTS,
  },
  maj7: {
    id: 'maj7',
    label: 'maj7',
    symbol: 'maj7',
    name: 'Major 7th',
    seventhChord: [I.R, I.M3, I.P5, I.M7],
    roots: FLAT_ROOTS,
  },
  m7b5: {
    id: 'm7b5',
    label: 'm7♭5',
    symbol: 'm7♭5',
    name: 'Half-diminished',
    seventhChord: [I.R, I.b3, I.b5, I.b7],
    roots: MINOR_ROOTS,
  },
  '7alt': {
    id: '7alt',
    label: '7alt',
    symbol: '7♭9♭13',
    name: 'Altered dominant',
    // Rootless four-note set (3-♭13-♭7-♭9) so drop-2 keeps the altered sound.
    seventhChord: [I.M3, I.b13, I.b7, I.b9],
    roots: ALT_ROOTS,
  },
}

export const CHORD_ORDER: ChordId[] = ['m7', '7', 'maj7', 'm7b5', '7alt']

/** Root spelling for pitch class `pc` (0 = C) in the context of this chord type. */
export function rootFor(chord: ChordType, pc: number): SpelledNote {
  return parseNote(chord.roots[pc])
}

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]

/** A note with its spelling, e.g. E♭ = { letter: 'E', acc: -1 }. */
export interface SpelledNote {
  letter: Letter
  /** Accidental: -2 = 𝄫, -1 = ♭, 0 = natural, 1 = ♯, 2 = 𝄪 */
  acc: number
}

/** Which part of the chord a tone plays; drives the key colours. */
export type Role = 'root' | 'third' | 'fifth' | 'seventh' | 'tension'

export interface Interval {
  /** Scale degree used for spelling (1, 3, 5, 7, 9, 11, 13). */
  degree: number
  /** Distance above the root in semitones (may exceed 12 for tensions). */
  semitones: number
  /** Display label, e.g. "♭3", "13". */
  label: string
  role: Role
}

const mod12 = (n: number) => ((n % 12) + 12) % 12

export function pitchClass(note: SpelledNote): number {
  return mod12(LETTER_PC[LETTERS.indexOf(note.letter)] + note.acc)
}

const ACC_SYMBOL: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' }

export function noteName(note: SpelledNote): string {
  return note.letter + (ACC_SYMBOL[note.acc] ?? '')
}

/** Parse "C", "Eb", "F#", "Bbb" into a SpelledNote. */
export function parseNote(name: string): SpelledNote {
  const letter = name[0].toUpperCase() as Letter
  let acc = 0
  for (const ch of name.slice(1)) {
    if (ch === 'b' || ch === '♭') acc--
    else if (ch === '#' || ch === '♯') acc++
  }
  return { letter, acc }
}

/** Spell the note that lies `interval` above `root`, respecting the scale degree. */
export function transpose(root: SpelledNote, interval: Interval): SpelledNote {
  const letterIdx = (LETTERS.indexOf(root.letter) + interval.degree - 1) % 7
  const targetPc = mod12(pitchClass(root) + interval.semitones)
  let acc = mod12(targetPc - LETTER_PC[letterIdx])
  if (acc > 6) acc -= 12
  return { letter: LETTERS[letterIdx], acc }
}

const iv = (degree: number, semitones: number, label: string, role: Role): Interval => ({
  degree,
  semitones,
  label,
  role,
})

export const INTERVALS = {
  R: iv(1, 0, '1', 'root'),
  b3: iv(3, 3, '♭3', 'third'),
  M3: iv(3, 4, '3', 'third'),
  b5: iv(5, 6, '♭5', 'fifth'),
  P5: iv(5, 7, '5', 'fifth'),
  b7: iv(7, 10, '♭7', 'seventh'),
  M7: iv(7, 11, '7', 'seventh'),
  b9: iv(9, 13, '♭9', 'tension'),
  N9: iv(9, 14, '9', 'tension'),
  P11: iv(11, 17, '11', 'tension'),
  b13: iv(13, 20, '♭13', 'tension'),
  M13: iv(13, 21, '13', 'tension'),
} as const

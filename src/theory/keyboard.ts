const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]

export const isBlack = (midi: number) => !WHITE_PCS.includes(((midi % 12) + 12) % 12)

/** Index among white keys; a black key maps to the white key directly below it. */
export function whiteIndex(midi: number): number {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12)
  let i = 6
  while (WHITE_PCS[i] > pc) i--
  return octave * 7 + i
}

export function whiteToMidi(index: number): number {
  return Math.floor(index / 7) * 12 + WHITE_PCS[((index % 7) + 7) % 7]
}

export interface KeyRange {
  /** Lowest key (always white). */
  low: number
  /** Highest key (always white). */
  high: number
}

/** 2 octaves + 1 key, e.g. C3–C5. */
export const MIN_WHITE_KEYS = 15

/**
 * A keyboard window of at least two octaves that slides so the given notes sit
 * roughly centred, with at least one spare white key at either edge.
 */
export function fitRange(midis: number[], minWhites = MIN_WHITE_KEYS): KeyRange {
  if (!midis.length) return { low: 48, high: 72 }
  const lo = whiteIndex(Math.min(...midis))
  const hiMidi = Math.max(...midis)
  const hi = whiteIndex(hiMidi) + (isBlack(hiMidi) ? 1 : 0)
  const needed = hi - lo + 1 + 2
  const total = Math.max(minWhites, needed)
  const start = lo - Math.floor((total - (hi - lo + 1)) / 2)
  return { low: whiteToMidi(start), high: whiteToMidi(start + total - 1) }
}

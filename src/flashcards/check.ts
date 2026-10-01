export type Mark = 'correct' | 'wrong'

export interface KeyRange {
  low: number
  high: number
}

export interface CheckResult {
  /** Same notes, same order, same spacing; any octave. */
  correct: boolean
  /** Octave shift (multiple of 12) at which the target is compared and shown. */
  shift: number
  /** Verdict per played key. */
  marks: Record<number, Mark>
  /** Target keys (already shifted) that were not played. */
  missing: number[]
  /** A played root below the voicing, ignored for rootless voicings. */
  ignoredBass: number | null
}

/** Octave shifts that keep every target note inside the range. */
export function fittingShifts(target: number[], range: KeyRange): number[] {
  const lo = Math.min(...target)
  const hi = Math.max(...target)
  const shifts: number[] = []
  for (let s = Math.ceil((range.low - lo) / 12) * 12; hi + s <= range.high; s += 12) shifts.push(s)
  return shifts
}

/**
 * Compare played keys with the target voicing. The shape must match exactly, but it may be
 * played in any octave. With `bassPc` set (rootless voicings), a root played below
 * everything else is ignored: the bass player has it.
 */
export function checkShape(target: number[], playedKeys: number[], range: KeyRange, bassPc?: number): CheckResult {
  const t = [...target].sort((a, b) => a - b)
  let p = [...new Set(playedKeys)].sort((a, b) => a - b)
  let ignoredBass: number | null = null
  if (bassPc !== undefined && p.length > 1 && ((p[0] % 12) + 12) % 12 === bassPc) {
    ignoredBass = p[0]
    p = p.slice(1)
  }

  const offset = p.length ? p[0] - t[0] : NaN
  const correct = p.length === t.length && offset % 12 === 0 && p.every((m, i) => m - t[i] === offset)

  // Show the target where it overlaps most with what was played (nearest the played notes on a tie).
  const played = new Set(p)
  let shift = correct ? offset : 0
  if (!correct) {
    const candidates = fittingShifts(t, range)
    let best = -1
    for (const s of candidates.length ? candidates : [0]) {
      const hits = t.filter((m) => played.has(m + s)).length
      const distance = p.length ? Math.abs(t[0] + s - p[0]) : Math.abs(s)
      const bestDistance = p.length ? Math.abs(t[0] + shift - p[0]) : Math.abs(shift)
      if (hits > best || (hits === best && distance < bestDistance)) {
        best = hits
        shift = s
      }
    }
  }

  const shifted = new Set(t.map((m) => m + shift))
  const marks: Record<number, Mark> = {}
  for (const m of p) marks[m] = shifted.has(m) ? 'correct' : 'wrong'
  return { correct, shift, marks, missing: [...shifted].filter((m) => !played.has(m)), ignoredBass }
}

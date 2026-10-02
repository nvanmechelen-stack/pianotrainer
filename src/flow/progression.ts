import { CHORD_TYPES, type ChordId } from '../theory/chords'
import { INTERVALS, type Interval, noteName, parseNote, pitchClass, type SpelledNote, transpose } from '../theory/notes'
import { buildVoicing, type Voicing } from '../theory/voicings'

export type Quality = 'major' | 'minor'
export type FlowStyle = 'rootless' | 'shell' | 'closed'
/** wholeSteps: each new key a whole step lower (the I chord turns into the next ii); 6 keys per round. */
export type KeyOrder = 'wholeSteps' | 'fourths' | 'chromatic' | 'random' | 'single'
export type Degree = 'ii' | 'V' | 'I'

/**
 * Registers per style. Voicings follow the keys down (or up) the keyboard; `low`/`high` only
 * catch a long drift (e.g. twelve keys round the circle of fourths), where a key change then moves
 * back towards `centre`. After building, the whole flow is shifted by octaves to sit around `centre`.
 */
export const FLOW_RANGES: Record<FlowStyle, { low: number; high: number; centre: number }> = {
  rootless: { low: 40, high: 86, centre: 60 },
  closed: { low: 40, high: 86, centre: 60 },
  shell: { low: 28, high: 79, centre: 52 },
}

/** For shells the root (the bass) may leap by a 4th or 5th, within this window (E1–G3). */
const SHELL_ROOT = { low: 28, high: 55 }

/** The voices that should move smoothly: all of them, except the root of a shell. */
const smoothVoices = (notes: number[], style: FlowStyle) =>
  style === 'shell' ? [...notes].sort((a, b) => a - b).slice(1) : notes

// Key spellings: flats for major keys (G♭, not F♯); minor keys as their usual names.
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

const M2: Interval = { degree: 2, semitones: 2, label: '2', role: 'tension' }

const CHORDS: Record<Quality, Record<Degree, ChordId>> = {
  major: { ii: 'm7', V: '7', I: 'maj7' },
  minor: { ii: 'm7b5', V: '7alt', I: 'm69' },
}

const mod12 = (n: number) => ((n % 12) + 12) % 12

export const keyNote = (q: Quality, pc: number): SpelledNote =>
  parseNote((q === 'major' ? MAJOR_KEYS : MINOR_KEYS)[mod12(pc)])

export const keyLabel = (q: Quality, pc: number) => `${noteName(keyNote(q, pc))} ${q}`

export function keySequence(order: KeyOrder, startPc: number, rng: () => number = Math.random): number[] {
  const start = mod12(startPc)
  switch (order) {
    case 'wholeSteps':
      return Array.from({ length: 6 }, (_, i) => mod12(start - 2 * i))
    case 'fourths':
      return Array.from({ length: 12 }, (_, i) => mod12(start + 5 * i))
    case 'chromatic':
      return Array.from({ length: 12 }, (_, i) => mod12(start - i))
    case 'random': {
      const rest = Array.from({ length: 11 }, (_, i) => mod12(start + 1 + i))
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      return [start, ...rest]
    }
    case 'single':
      return [start]
  }
}

/** Where the next round starts: for whole steps, the other six keys (C ↔ E♭). */
export function nextRoundStart(order: KeyOrder, startPc: number): number {
  if (order !== 'wholeSteps') return mod12(startPc)
  return mod12(startPc % 2 === 0 ? startPc + 3 : startPc - 3)
}

export interface FlowChord {
  keyPc: number
  degree: Degree
  chordId: ChordId
  root: SpelledNote
  symbol: string
  /** Length in beats. */
  beats: number
  voicing: Voicing
}

const upper = (v: Voicing) => v.notes.filter((n) => !n.isBass).map((n) => n.midi)

function shiftVoicing(v: Voicing, shift: number): Voicing {
  return shift ? { ...v, notes: v.notes.map((n) => ({ ...n, midi: n.midi + shift })) } : v
}

/** Total movement between two chords: voices paired low to high (nearest note if the counts differ). */
export function movement(prev: number[], next: number[]): number {
  const a = [...prev].sort((x, y) => x - y)
  const b = [...next].sort((x, y) => x - y)
  if (a.length === b.length) return a.reduce((sum, m, i) => sum + Math.abs(m - b[i]), 0)
  return b.reduce((sum, m) => sum + Math.min(...a.map((p) => Math.abs(p - m))), 0)
}

interface Placed {
  voicing: Voicing
  cost: number
}

/** Every octave of `v` within the style's range, the one that moves least from `prev` first. */
function placements(v: Voicing, prev: number[] | null, style: FlowStyle): Placed[] {
  const range = FLOW_RANGES[style]
  const notes = upper(v)
  const all: Placed[] = []
  for (let k = -5; k <= 5; k++) {
    const shifted = notes.map((m) => m + 12 * k)
    const lowest = Math.min(...shifted)
    if (lowest < range.low || Math.max(...shifted) > range.high) continue
    if (style === 'shell' && (lowest < SHELL_ROOT.low || lowest > SHELL_ROOT.high)) continue
    const avg = shifted.reduce((a, b) => a + b, 0) / shifted.length
    const cost = prev
      ? movement(smoothVoices(prev, style), smoothVoices(shifted, style)) + Math.abs(avg - range.centre) / 100
      : Math.abs(avg - range.centre)
    all.push({ voicing: shiftVoicing(v, 12 * k), cost })
  }
  return all.length ? all.sort((a, b) => a.cost - b.cost) : [{ voicing: v, cost: 1000 }]
}

/**
 * Which form each degree uses. Every ii–V–I starts on the same shape: closed chords with the ii in
 * root position (1-3-5-7), then V and I in the inversion closest to the chord before; rootless
 * A → B → A; shells 1-3-7 → 1-7-3 → 1-3-7.
 */
const FORMS: Record<Exclude<FlowStyle, 'closed'>, Record<Degree, number>> = {
  rootless: { ii: 0, V: 1, I: 0 },
  shell: { ii: 0, V: 1, I: 0 },
}

export interface FlowOptions {
  quality: Quality
  style: FlowStyle
  keys: number[]
  /** Beats for ii and V; the I chord lasts twice as long. */
  beatsPerChord: number
}

const DEGREES: Degree[] = ['ii', 'V', 'I']

export function buildFlow({ quality, style, keys, beatsPerChord }: FlowOptions): FlowChord[] {
  const out: FlowChord[] = []
  let prev: number[] | null = null
  for (const keyPc of keys) {
    const tonic = keyNote(quality, keyPc)
    const roots: Record<Degree, SpelledNote> = {
      ii: transpose(tonic, M2),
      V: transpose(tonic, INTERVALS.P5),
      I: tonic,
    }
    for (const degree of DEGREES) {
      const chordId = CHORDS[quality][degree]
      const root = roots[degree]
      // Each chord sits in the octave that moves least from the one before, so the hand follows
      // the keys down the keyboard.
      const variants = style === 'closed' ? (degree === 'ii' ? [0] : [0, 1, 2, 3]) : [FORMS[style][degree]]
      const placed = variants
        .flatMap((v) => placements(buildVoicing(root, chordId, style, v), prev, style))
        .reduce((a, b) => (b.cost < a.cost ? b : a))
      out.push({
        keyPc,
        degree,
        chordId,
        root,
        symbol: noteName(root) + CHORD_TYPES[chordId].symbol,
        beats: degree === 'I' ? beatsPerChord * 2 : beatsPerChord,
        voicing: placed.voicing,
      })
      prev = upper(placed.voicing)
    }
  }

  // Centre the whole flow in its register, keeping its shape (a falling round starts high, ends low).
  const all = out.flatMap((c) => upper(c.voicing))
  const mean = all.reduce((a, b) => a + b, 0) / all.length
  const shift = 12 * Math.round((FLOW_RANGES[style].centre - mean) / 12)
  return shift ? out.map((c) => ({ ...c, voicing: shiftVoicing(c.voicing, shift) })) : out
}

/**
 * How each upper note of `next` moves from `prev`, in semitones (0 = common tone).
 * Voices are paired low to high; with different counts, each note is paired with its nearest predecessor.
 */
export function voiceMoves(prev: Voicing | null, next: Voicing): Map<number, number> {
  const moves = new Map<number, number>()
  if (!prev) return moves
  const a = upper(prev).sort((x, y) => x - y)
  const b = upper(next).sort((x, y) => x - y)
  b.forEach((m, i) => {
    const from =
      a.length === b.length ? a[i] : a.reduce((best, p) => (Math.abs(p - m) < Math.abs(best - m) ? p : best))
    moves.set(m, m - from)
  })
  return moves
}

/** "=" for a common tone, otherwise direction and size in whole steps: "↓½", "↑1". */
export function moveBadge(semitones: number): string {
  if (semitones === 0) return '='
  const size = Math.abs(semitones) / 2
  const text = size === 0.5 ? '½' : Number.isInteger(size) ? `${size}` : `${Math.floor(size)}½`
  return (semitones > 0 ? '↑' : '↓') + text
}

export const bassPc = (c: FlowChord) => pitchClass(c.root)

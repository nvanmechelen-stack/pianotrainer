import { CHORD_TYPES, type ChordId, type ChordType } from './chords'
import { INTERVALS as I, type Interval, noteName, pitchClass, type SpelledNote, transpose } from './notes'

export type VoicingStyle = 'closed' | 'shell' | 'rootless' | 'drop2'

export interface VoicedNote {
  midi: number
  note: SpelledNote
  interval: Interval
  /** Root played by the bass player (rootless voicings); drawn in its own colour. */
  isBass: boolean
}

export interface Voicing {
  /** Ascending by pitch. */
  notes: VoicedNote[]
  symbol: string
  title: string
  description: string
}

export interface StyleInfo {
  id: VoicingStyle
  label: string
  variants: (chord: ChordType) => string[]
}

const labels = (ivs: Interval[]) => ivs.map((i) => i.label).join('-')

const INVERSIONS = ['Root pos.', '1st inv.', '2nd inv.', '3rd inv.']
const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion']

export const VOICING_STYLES: StyleInfo[] = [
  // Variant i is the i-th inversion: closedChord[i] in the bass.
  { id: 'closed', label: 'Closed', variants: () => INVERSIONS },
  {
    id: 'shell',
    label: 'Basic Shell',
    variants: (c) => shellForms(c.id).map(labels),
  },
  { id: 'rootless', label: 'Rootless', variants: () => ['Form A', 'Form B'] },
  {
    id: 'drop2',
    label: 'Drop-2',
    // Variant i has seventhChord[i] in the bass.
    variants: (c) =>
      c.seventhChord[0] === I.R
        ? INVERSIONS
        : c.seventhChord.map((iv) => `${iv.label} bass`),
  },
]

function guideTones(id: ChordId): [Interval, Interval] {
  switch (id) {
    case 'm7':
    case 'm7b5':
      return [I.b3, I.b7]
    case 'm69':
      return [I.b3, I.M6]
    case 'maj7':
      return [I.M3, I.M7]
    case '7':
    case '7alt':
      return [I.M3, I.b7]
  }
}

function shellForms(id: ChordId): Interval[][] {
  const [third, seventh] = guideTones(id)
  return [
    [I.R, third, seventh],
    [I.R, seventh, third],
  ]
}

/** Bill Evans rootless left-hand voicings, low to high. */
const ROOTLESS: Record<ChordId, { A: Interval[]; B: Interval[]; note: string }> = {
  m7: {
    A: [I.b3, I.P5, I.b7, I.N9],
    B: [I.b7, I.N9, I.b3, I.P5],
    note: 'A minor 9 sound: the 5th stays and the 9 adds colour. Variation: replace the 5 with the 11.',
  },
  '7': {
    A: [I.M3, I.M13, I.b7, I.N9],
    B: [I.b7, I.N9, I.M3, I.M13],
    note: 'A 13 sound: the 5th is replaced by the 13. In form A the 13 sits in the 5th’s spot; in form B it is on top, so 3rd and 7th never clash.',
  },
  maj7: {
    A: [I.M3, I.P5, I.M7, I.N9],
    B: [I.M7, I.N9, I.M3, I.P5],
    note: 'A maj9 sound. Variation: replace the 5 with the 6 for a 6/9 colour.',
  },
  m7b5: {
    A: [I.b3, I.b5, I.b7, I.P11],
    B: [I.b7, I.P11, I.b3, I.b5],
    note: 'The ♭5 defines this chord, so it stays. Instead of a 9 (a harsh ♭9 above the root) the consonant 11 is added.',
  },
  '7alt': {
    A: [I.M3, I.b13, I.b7, I.b9],
    B: [I.b7, I.b9, I.M3, I.b13],
    note: 'The ♭9 and ♭13 make this the natural V in a minor ii–V–i, following a m7♭5.',
  },
  m69: {
    A: [I.b3, I.P5, I.M6, I.N9],
    B: [I.M6, I.N9, I.b3, I.P5],
    note: 'The classic minor tonic: the 6 takes the place of the ♭7 and the 9 adds colour.',
  },
}

/**
 * Semitone offsets from the root for the given tones, each placed at the first
 * occurrence above the previous tone (close voicing in the given order).
 */
function stackAscending(ivs: Interval[]): number[] {
  const out: number[] = []
  for (const iv of ivs) {
    let s = iv.semitones % 12
    if (out.length) {
      const prev = out[out.length - 1]
      while (s <= prev) s += 12
    }
    out.push(s)
  }
  return out
}

/** Root MIDI number such that the lowest offset lands in [low, low + 11]. */
function placeRoot(rootPc: number, lowestOffset: number, low: number): number {
  const lowestPc = (rootPc + lowestOffset) % 12
  const lowest = low + (((lowestPc - low) % 12) + 12) % 12
  return lowest - lowestOffset
}

// Register targets for the lowest played note (MIDI numbers).
const LOW_CLOSED = 48 // C3
const LOW_SHELL = 43 // G2
const LOW_ROOTLESS = 50 // D3
const LOW_DROP2 = 48 // C3

function voiceNotes(root: SpelledNote, ivs: Interval[], offsets: number[], low: number): VoicedNote[] {
  const rootMidi = placeRoot(pitchClass(root), offsets[0], low)
  return ivs.map((interval, i) => ({
    midi: rootMidi + offsets[i],
    note: transpose(root, interval),
    interval,
    isBass: false,
  }))
}

export function buildVoicing(
  root: SpelledNote,
  chordId: ChordId,
  style: VoicingStyle,
  variant: number,
): Voicing {
  const chord = CHORD_TYPES[chordId]
  const symbol = noteName(root) + chord.symbol

  if (style === 'closed') {
    const inversion = Math.min(Math.max(variant, 0), 3)
    const tones = chord.closedChord
    const ivs = [...tones.slice(inversion), ...tones.slice(0, inversion)]
    const notes = voiceNotes(root, ivs, stackAscending(ivs), LOW_CLOSED)
    return {
      notes,
      symbol,
      title: `Closed · ${INVERSION_NAMES[inversion]} (${labels(ivs)})`,
      description:
        'All four chord tones stacked as close together as possible. ' +
        (inversion === 0
          ? 'In root position the root is in the bass: the textbook shape to learn every chord from.'
          : `In the ${INVERSION_NAMES[inversion].toLowerCase()} the ${ivs[0].label} is in the bass. ` +
            'Inversions let you move between chords with small steps instead of jumps.') +
        (chordId === '7alt' ? ' For 7alt the ♭13 (= ♯5) replaces the 5th, a 7♯5 sound.' : ''),
    }
  }

  if (style === 'shell') {
    const ivs = shellForms(chordId)[variant] ?? shellForms(chordId)[0]
    const notes = voiceNotes(root, ivs, stackAscending(ivs), LOW_SHELL)
    const [third, seventh] = guideTones(chordId)
    return {
      notes,
      symbol,
      title: `Basic Shell · ${labels(ivs)}`,
      description:
        `The bare essentials: the root in the bass plus the guide tones ${third.label} and ${seventh.label}, ` +
        'which define the chord quality. ' +
        (variant === 0
          ? 'With the 3rd directly above the root the sound is compact.'
          : 'With the 7th in the middle the shell opens up, which sounds clearer in a low register.') +
        (chordId === 'm7b5' ? ' The ♭5 is left out here; use a rootless voicing to hear it.' : '') +
        (chordId === '7alt' ? ' The alterations are not in the shell; add them on top with the right hand.' : ''),
    }
  }

  if (style === 'rootless') {
    const def = ROOTLESS[chordId]
    const form = variant === 1 ? 'B' : 'A'
    const ivs = def[form]
    const notes = voiceNotes(root, ivs, stackAscending(ivs), LOW_ROOTLESS)
    const lowest = notes[0].midi
    const rootPc = pitchClass(root)
    const gap = ((lowest - rootPc) % 12 + 12) % 12 || 12
    notes.unshift({ midi: lowest - gap, note: root, interval: I.R, isBass: true })
    return {
      notes,
      symbol,
      title: `Rootless · Form ${form} (${labels(ivs)})`,
      description:
        `Bill Evans-style left-hand voicing starting on the ${ivs[0].label}. ` +
        'The root is left to the bass player (shown in the bass colour). ' +
        def.note +
        ' Alternate A and B through a ii–V–I (A → B → A) for almost no hand movement.',
    }
  }

  // Drop-2: stack the seventh chord closed, then drop the 2nd voice from the top an octave.
  const inversion = Math.min(Math.max(variant, 0), 3)
  const closedRotation = (inversion + 2) % 4
  const tones = chord.seventhChord
  const closed = [...tones.slice(closedRotation), ...tones.slice(0, closedRotation)]
  const offsets = stackAscending(closed)
  offsets[2] -= 12
  const order = [2, 0, 1, 3]
  const ivs = order.map((i) => closed[i])
  const notes = voiceNotes(
    root,
    ivs,
    order.map((i) => offsets[i]),
    LOW_DROP2,
  )
  const invName = VOICING_STYLES.find((st) => st.id === 'drop2')!.variants(chord)[inversion]
  return {
    notes,
    symbol,
    title: `Drop-2 · ${invName} (${labels(ivs)})`,
    description:
      'Start from a closed four-note chord and drop the second voice from the top down an octave. ' +
      `The chord spreads over a wider range: here the ${ivs[0].label} is in the bass and the ${ivs[3].label} on top. ` +
      'Great for two-handed comping and for harmonizing a melody note on top.' +
      (chordId === '7alt' ? ' For 7alt the rootless set 3-♭13-♭7-♭9 is used, so the altered colour stays intact.' : ''),
  }
}

export interface VoicingName {
  /** e.g. "Rootless Form B" */
  name: string
  /** e.g. "starting on the ♭7" */
  detail: string
}

/** How a voicing is named in an assignment: "Rootless Form B (starting on the ♭7)". */
export function describeVoicing(chordId: ChordId, style: VoicingStyle, variant: number): VoicingName {
  const probe = buildVoicing({ letter: 'C', acc: 0 }, chordId, style, variant).notes.filter((n) => !n.isBass)
  const lowest = probe[0].interval.label
  const inBass = `${lowest} in the bass`
  switch (style) {
    case 'closed':
      return { name: INVERSION_NAMES[variant], detail: inBass }
    case 'shell':
      return { name: 'Basic Shell', detail: probe.map((n) => n.interval.label).join('-') }
    case 'rootless':
      return { name: `Rootless Form ${variant === 1 ? 'B' : 'A'}`, detail: `starting on the ${lowest}` }
    case 'drop2': {
      const hasRoot = CHORD_TYPES[chordId].seventhChord[0] === I.R
      return { name: hasRoot ? `Drop-2 ${INVERSION_NAMES[variant]}` : 'Drop-2', detail: inBass }
    }
  }
}

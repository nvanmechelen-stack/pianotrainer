import { playNote } from '../audio/piano'
import { fitRange } from '../theory/keyboard'
import { noteName } from '../theory/notes'
import type { VoicedNote, Voicing } from '../theory/voicings'
import { PianoKeyboard } from './PianoKeyboard'
import { type ColorKey, ROLE_COLORS, ROLE_LABELS } from './roleColors'
import { Segmented } from './Segmented'

export type LabelMode = 'degree' | 'note'

export const colorKey = (n: VoicedNote): ColorKey => (n.isBass ? 'bass' : n.interval.role)

export function LabelToggle({ value, onChange }: { value: LabelMode; onChange: (m: LabelMode) => void }) {
  return (
    <Segmented
      options={[
        { value: 'degree', label: 'Degrees' },
        { value: 'note', label: 'Notes' },
      ]}
      value={value}
      onChange={onChange}
    />
  )
}

/** Blank two-octave window shown while a voicing is still hidden. */
const HIDDEN_RANGE = { low: 48, high: 72 }

interface Props {
  /** null shows an empty keyboard. */
  voicing: Voicing | null
  labelMode: LabelMode
  /** Size classes for the keyboard itself. */
  keyboardClassName?: string
}

/** Keyboard with a voicing lit up in role colours, plus a legend. */
export function VoicingKeyboard({
  voicing,
  labelMode,
  keyboardClassName = 'max-h-[45dvh] short:max-h-[58dvh]',
}: Props) {
  const notes = voicing?.notes ?? []
  const range = voicing ? fitRange(notes.map((n) => n.midi)) : HIDDEN_RANGE
  const legend = [...new Set(notes.map(colorKey))]
  return (
    <>
      <PianoKeyboard
        low={range.low}
        high={range.high}
        highlights={notes.map((n) => ({
          midi: n.midi,
          label: labelMode === 'degree' ? n.interval.label : noteName(n.note),
          color: ROLE_COLORS[colorKey(n)],
        }))}
        onKeyPress={(m) => playNote(m)}
        className={`block w-full ${keyboardClassName}`}
      />
      <div className="mt-2 flex min-h-4 flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-muted short:mt-1">
        {legend.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLORS[k] }} />
            {ROLE_LABELS[k]}
          </span>
        ))}
      </div>
    </>
  )
}

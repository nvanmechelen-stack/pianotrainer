import type { ReactNode } from 'react'
import { ALL_ROOTS, type DeckSettings, EASY_ROOTS } from '../flashcards/deck'
import { CHORD_ORDER, CHORD_TYPES, type ChordId, rootFor } from '../theory/chords'
import { noteName } from '../theory/notes'
import { Chip, Switch } from './Controls'

const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

interface Props {
  settings: DeckSettings
  onChange: (next: DeckSettings) => void
  /** Small print under the settings. */
  note?: ReactNode
}

/** Which chords to practise: chord types, roots, inversions and voicings (Flashcards and Speed Trainer). */
export function DeckSettingsPanel({ settings, onChange, note }: Props) {
  return (
    <section className="flex flex-col gap-2.5 rounded-3xl border border-line bg-panel p-3 shadow-lg short:gap-1.5 short:p-2">
      <div>
        <h2 className="mb-1.5 text-xs font-black tracking-wide text-muted uppercase">Chord types</h2>
        <div className="flex flex-wrap gap-1.5">
          {CHORD_ORDER.map((id: ChordId) => (
            <Chip
              key={id}
              on={settings.chords.includes(id)}
              onClick={() => onChange({ ...settings, chords: toggleIn(settings.chords, id) })}
            >
              {CHORD_TYPES[id].label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <h2 className="text-xs font-black tracking-wide text-muted uppercase">Roots</h2>
          <button
            type="button"
            onClick={() => onChange({ ...settings, roots: ALL_ROOTS })}
            className="rounded-lg bg-panel-2 px-2 py-0.5 text-xs font-black"
          >
            All 12
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, roots: EASY_ROOTS })}
            className="rounded-lg bg-panel-2 px-2 py-0.5 text-xs font-black"
          >
            Easy keys
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
          {ALL_ROOTS.map((pc) => (
            <Chip
              key={pc}
              on={settings.roots.includes(pc)}
              onClick={() => onChange({ ...settings, roots: toggleIn(settings.roots, pc) })}
            >
              {noteName(rootFor(CHORD_TYPES['7'], pc))}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Switch
          on={settings.inversions}
          onClick={() => onChange({ ...settings, inversions: !settings.inversions })}
          label="Inversions"
          hint="1st, 2nd and 3rd inversion"
        />
        <Switch
          on={settings.voicings}
          onClick={() => onChange({ ...settings, voicings: !settings.voicings })}
          label="Voicings"
          hint="Shell, Rootless A/B, Drop-2"
        />
      </div>
      {note && <p className="text-xs font-bold text-muted">{note}</p>}
    </section>
  )
}

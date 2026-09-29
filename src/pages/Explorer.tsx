import { useState } from 'react'
import { playChord, playNote } from '../audio/piano'
import { ArpIcon, PlayIcon } from '../components/Icons'
import { type KeyHighlight, PianoKeyboard } from '../components/PianoKeyboard'
import { type ColorKey, ROLE_COLORS, ROLE_LABELS } from '../components/roleColors'
import { CHORD_ORDER, CHORD_TYPES, type ChordId, rootFor } from '../theory/chords'
import { fitRange } from '../theory/keyboard'
import { noteName } from '../theory/notes'
import { buildVoicing, VOICING_STYLES, type VoicingStyle } from '../theory/voicings'

type LabelMode = 'degree' | 'note'

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}

function Segmented<T extends string | number>({ options, value, onChange, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`flex gap-1 rounded-2xl bg-ink/60 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-2.5 py-1.5 text-sm font-extrabold whitespace-nowrap transition-colors short:px-2 short:py-1 short:text-xs ${
            o.value === value
              ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow'
              : 'text-muted hover:bg-panel-2 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Explorer() {
  const [rootPc, setRootPc] = useState(2) // D
  const [chordId, setChordId] = useState<ChordId>('m7')
  const [style, setStyle] = useState<VoicingStyle>('rootless')
  const [variant, setVariant] = useState(0)
  const [labelMode, setLabelMode] = useState<LabelMode>('degree')

  const chord = CHORD_TYPES[chordId]
  const root = rootFor(chord, rootPc)
  const voicing = buildVoicing(root, chordId, style, variant)
  const styleInfo = VOICING_STYLES.find((s) => s.id === style)!
  const variants = styleInfo.variants(chord)

  const midis = voicing.notes.map((n) => n.midi)
  const range = fitRange(midis)
  const colorKey = (n: (typeof voicing.notes)[number]): ColorKey => (n.isBass ? 'bass' : n.interval.role)

  const highlights: KeyHighlight[] = voicing.notes.map((n) => ({
    midi: n.midi,
    label: labelMode === 'degree' ? n.interval.label : noteName(n.note),
    color: ROLE_COLORS[colorKey(n)],
  }))
  const legend = [...new Set(voicing.notes.map(colorKey))]

  const changeStyle = (s: VoicingStyle) => {
    setStyle(s)
    setVariant(0)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-3 sm:p-4 short:gap-2 short:p-2">
      {/* Controls */}
      <section className="flex flex-col gap-2 rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:gap-1.5 short:rounded-2xl short:p-1.5">
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
          {Array.from({ length: 12 }, (_, pc) => (
            <button
              key={pc}
              type="button"
              onClick={() => setRootPc(pc)}
              className={`rounded-xl py-1.5 text-sm font-black transition-colors short:py-1 short:text-xs ${
                pc === rootPc
                  ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow'
                  : 'bg-ink/60 text-muted hover:bg-panel-2 hover:text-white'
              }`}
            >
              {noteName(rootFor(chord, pc))}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            className="min-w-[16rem] flex-1 short:min-w-0"
            options={CHORD_ORDER.map((id) => ({ value: id, label: CHORD_TYPES[id].label }))}
            value={chordId}
            onChange={setChordId}
          />
          <Segmented
            className="min-w-[16rem] flex-1 short:min-w-0"
            options={VOICING_STYLES.map((s) => ({ value: s.id, label: s.label }))}
            value={style}
            onChange={changeStyle}
          />
          <Segmented
            className="w-full short:w-auto short:flex-1"
            options={variants.map((label, i) => ({ value: i, label }))}
            value={variant}
            onChange={setVariant}
          />
        </div>
      </section>

      {/* Keyboard */}
      <section className="rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
        <div className="mb-2 flex flex-wrap items-center gap-2 short:mb-1">
          <div className="mr-auto flex items-baseline gap-2">
            <h1 className="text-2xl leading-none font-black short:text-xl">{voicing.symbol}</h1>
            <span className="text-sm font-bold text-muted">{chord.name}</span>
          </div>
          <Segmented
            options={[
              { value: 'degree', label: 'Degrees' },
              { value: 'note', label: 'Notes' },
            ]}
            value={labelMode}
            onChange={setLabelMode}
          />
          <button
            type="button"
            onClick={() => playChord(midis)}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-accent to-accent-2 px-3 py-2 text-sm font-black shadow active:scale-95 short:py-1"
          >
            <PlayIcon className="h-4 w-4" /> Play
          </button>
          <button
            type="button"
            onClick={() => playChord(midis, true)}
            aria-label="Play as arpeggio"
            className="rounded-2xl bg-panel-2 px-3 py-2 text-sm font-black active:scale-95 short:py-1.5"
          >
            <ArpIcon className="h-4 w-4" />
          </button>
        </div>
        <PianoKeyboard
          low={range.low}
          high={range.high}
          highlights={highlights}
          onKeyPress={(m) => playNote(m)}
          className="block max-h-[45dvh] w-full short:max-h-[58dvh]"
        />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-muted short:mt-1">
          {legend.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLORS[k] }} />
              {ROLE_LABELS[k]}
            </span>
          ))}
        </div>
      </section>

      {/* Explanation */}
      <section className="rounded-3xl border border-line bg-panel p-3 shadow-lg">
        <h2 className="font-black">{voicing.title}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {voicing.notes.map((n) => (
            <span
              key={n.midi}
              className="flex items-baseline gap-1 rounded-xl bg-ink/60 px-2.5 py-1 text-sm font-black"
              style={{ color: ROLE_COLORS[colorKey(n)] }}
            >
              {noteName(n.note)}
              <span className="text-xs font-bold text-muted">{n.isBass ? 'bass' : n.interval.label}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#d6d4f2]">{voicing.description}</p>
      </section>
    </div>
  )
}

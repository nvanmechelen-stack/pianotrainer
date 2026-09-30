import { useState } from 'react'
import { playChord } from '../audio/piano'
import { ArpIcon, PlayIcon } from '../components/Icons'
import { ROLE_COLORS } from '../components/roleColors'
import { Segmented } from '../components/Segmented'
import { colorKey, LabelToggle, type LabelMode, VoicingKeyboard } from '../components/VoicingKeyboard'
import { CHORD_ORDER, CHORD_TYPES, type ChordId, rootFor } from '../theory/chords'
import { noteName } from '../theory/notes'
import { buildVoicing, VOICING_STYLES, type VoicingStyle } from '../theory/voicings'

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
          <LabelToggle value={labelMode} onChange={setLabelMode} />
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
        <VoicingKeyboard voicing={voicing} labelMode={labelMode} />
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

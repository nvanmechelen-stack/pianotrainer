import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playChord, playClick } from '../audio/piano'
import { Chip, Kbd, Switch } from '../components/Controls'
import { PlayIcon } from '../components/Icons'
import { type KeyHighlight, PianoKeyboard } from '../components/PianoKeyboard'
import { ROLE_COLORS, ROLE_LABELS } from '../components/roleColors'
import { Segmented } from '../components/Segmented'
import { colorKey, LabelToggle, type LabelMode } from '../components/VoicingKeyboard'
import {
  buildFlow,
  type FlowChord,
  type FlowStyle,
  keyLabel,
  keyNote,
  type KeyOrder,
  keySequence,
  moveBadge,
  nextRoundStart,
  type Quality,
  voiceMoves,
} from '../flow/progression'
import { fitRange } from '../theory/keyboard'
import { noteName } from '../theory/notes'
import { load, local, save } from '../storage'
import { TapAnswer } from './TapAnswer'

type Mode = 'listen' | 'practise'
type AnswerMode = 'piano' | 'screen'

interface FlowSettings {
  mode: Mode
  answer: AnswerMode
  quality: Quality
  style: FlowStyle
  order: KeyOrder
  startPc: number
  bpm: number
  click: boolean
  bass: boolean
  /** Beats for ii and V (the I lasts twice as long). */
  beatsPerChord: 4 | 2
}

const DEFAULTS: FlowSettings = {
  mode: 'listen',
  answer: 'piano',
  quality: 'major',
  style: 'closed',
  order: 'wholeSteps',
  startPc: 0,
  bpm: 80,
  click: true,
  bass: true,
  beatsPerChord: 4,
}

// v2: closed voicings became the default; start everyone fresh on the new defaults.
const SETTINGS_KEY = 'pianotrainer.flow.settings.v2'
const ALL_PCS = Array.from({ length: 12 }, (_, i) => i)
const BEATS_PER_BAR = 4
/** The previous chord, shown faintly so you can see where the voices come from. */
const PREVIOUS = '#c9c5e8'

const STYLE_LABELS: Record<FlowStyle, string> = { closed: 'Closed', rootless: 'Rootless', shell: 'Shells' }
const ORDER_LABELS: Record<KeyOrder, string> = {
  wholeSteps: 'Whole steps ↓',
  fourths: 'Circle of 4ths',
  chromatic: 'Chromatic ↓',
  random: 'Random',
  single: 'One key',
}

/** Notes to sound for a chord: the bass of a rootless voicing only when the bass is on. */
const soundingNotes = (c: FlowChord, bass: boolean) =>
  c.voicing.notes.filter((n) => bass || !n.isBass).map((n) => n.midi)

export function Flow() {
  const [settings, setSettings] = useState<FlowSettings>(() => ({
    ...DEFAULTS,
    ...load<FlowSettings>(local, SETTINGS_KEY),
  }))
  useEffect(() => save(local, SETTINGS_KEY, settings), [settings])
  const [showSettings, setShowSettings] = useState(false)
  const [labelMode, setLabelMode] = useState<LabelMode>('degree')
  // A new round id reshuffles a random key order.
  const [roundId, setRoundId] = useState(0)

  const flow = useMemo(
    () =>
      buildFlow({
        quality: settings.quality,
        style: settings.style,
        keys: keySequence(settings.order, settings.startPc),
        beatsPerChord: settings.beatsPerChord,
      }),
    // roundId: rebuild (and reshuffle) on a new round.
    [settings.quality, settings.style, settings.order, settings.startPc, settings.beatsPerChord, roundId],
  )
  const keyCount = flow.length / 3

  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [beatInBar, setBeatInBar] = useState(-1)
  const [step, setStep] = useState(0)

  const current = flow[Math.min(index, flow.length - 1)]
  const previous = index > 0 ? flow[index - 1] : null
  const keyIndex = Math.floor(index / 3)
  const keyChords = flow.slice(keyIndex * 3, keyIndex * 3 + 3)
  const nextChord = flow[keyIndex * 3 + 3]

  // ---- Listen: playback ------------------------------------------------------------------
  const timer = useRef<number | undefined>(undefined)
  // Tempo, click and bass can change while playing.
  const live = useRef(settings)
  live.current = settings

  const stop = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    setPlaying(false)
    setBeatInBar(-1)
  }, [])
  useEffect(() => stop, [stop])

  const reset = useCallback(() => {
    stop()
    setIndex(0)
    setFinished(false)
    setRevealed(false)
    setStep((n) => n + 1)
  }, [stop])

  const update = (patch: Partial<FlowSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    reset()
  }

  const play = () => {
    stop()
    const from = finished ? 0 : index
    setFinished(false)
    // Beat at which each chord starts, counted from `from`.
    const starts = new Map<number, number>()
    let total = 0
    for (let i = from; i < flow.length; i++) {
      starts.set(total, i)
      total += flow[i].beats
    }
    const countIn = settings.click ? BEATS_PER_BAR : 0
    let beat = -countIn
    let chord = from
    let next = performance.now()
    setPlaying(true)
    const tick = () => {
      if (beat >= total) {
        stop()
        setFinished(true)
        return
      }
      const barStart = ((beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR === 0
      if (live.current.click) playClick(barStart)
      setBeatInBar(((beat % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR)
      if (beat >= 0) {
        const starting = starts.get(beat)
        if (starting !== undefined) {
          chord = starting
          setIndex(starting)
        }
        // Strike on a chord change, and again on each new bar of a longer chord.
        if (starting !== undefined || barStart) playChord(soundingNotes(flow[chord], live.current.bass))
      }
      beat++
      next += 60000 / live.current.bpm
      timer.current = window.setTimeout(tick, Math.max(0, next - performance.now()))
    }
    tick()
  }

  const goTo = (i: number) => {
    stop()
    setFinished(false)
    setRevealed(false)
    setIndex(i)
    setStep((n) => n + 1)
    if (settings.mode === 'listen') playChord(soundingNotes(flow[i], settings.bass))
  }

  // ---- Practise ------------------------------------------------------------------------
  const reveal = useCallback(() => {
    setRevealed(true)
    playChord(soundingNotes(current, settings.bass))
  }, [current, settings.bass])

  const advance = useCallback(() => {
    setRevealed(false)
    setStep((n) => n + 1)
    if (index + 1 >= flow.length) setFinished(true)
    else setIndex(index + 1)
  }, [index, flow.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || showSettings || finished) return
      if (settings.mode === 'listen') {
        if (e.key === ' ') {
          e.preventDefault()
          if (playing) stop()
          else play()
        } else if (e.key === 'ArrowRight' && index + 1 < flow.length) {
          e.preventDefault()
          goTo(index + 1)
        } else if (e.key === 'ArrowLeft' && index > 0) {
          e.preventDefault()
          goTo(index - 1)
        }
      } else if (settings.answer === 'piano') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (revealed) advance()
          else reveal()
        } else if (e.key === 'ArrowRight' && revealed) {
          e.preventDefault()
          advance()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- Keyboard display ----------------------------------------------------------------
  const showCurrent = settings.mode === 'listen' || revealed
  const moves = voiceMoves(previous?.voicing ?? null, current.voicing)
  const highlights: KeyHighlight[] = []
  if (showCurrent) {
    for (const n of current.voicing.notes) {
      const move = n.isBass ? undefined : moves.get(n.midi)
      highlights.push({
        midi: n.midi,
        label: labelMode === 'degree' ? n.interval.label : noteName(n.note),
        color: ROLE_COLORS[colorKey(n)],
        badge: move === undefined ? undefined : moveBadge(move),
      })
    }
  } else if (previous) {
    for (const n of previous.voicing.notes) if (!n.isBass) highlights.push({ midi: n.midi, label: '', color: PREVIOUS })
  }
  // Keep the keyboard still within a key: fit it to all three chords (and the one before).
  const range = fitRange(
    [...keyChords, ...(previous ? [previous] : [])].flatMap((c) => c.voicing.notes.map((n) => n.midi)),
  )
  const legend = [...new Set(current.voicing.notes.map(colorKey))]

  const nextStart = nextRoundStart(settings.order, settings.startPc)
  const btn = 'rounded-2xl px-3.5 py-2 text-sm font-black active:scale-95 disabled:opacity-40 short:py-1.5'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-3 sm:p-4 short:gap-2 short:p-2">
      {/* Top bar */}
      <section className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
        <Segmented
          options={[
            { value: 'listen', label: 'Listen & watch' },
            { value: 'practise', label: 'Practise' },
          ]}
          value={settings.mode}
          onChange={(mode: Mode) => update({ mode })}
        />
        {settings.mode === 'practise' && (
          <Segmented
            options={[
              { value: 'piano', label: 'At piano' },
              { value: 'screen', label: 'On screen' },
            ]}
            value={settings.answer}
            onChange={(answer: AnswerMode) => update({ answer })}
          />
        )}
        <p className="min-w-0 flex-1 truncate px-1 text-xs font-bold text-muted">
          {keyLabel(settings.quality, settings.startPc)} · {STYLE_LABELS[settings.style]} ·{' '}
          {ORDER_LABELS[settings.order]}
        </p>
        <button
          type="button"
          onClick={() => {
            stop()
            setShowSettings((s) => !s)
          }}
          aria-expanded={showSettings}
          className={`rounded-2xl px-3 py-2 text-sm font-black short:py-1.5 ${showSettings ? 'bg-accent/30' : 'bg-panel-2'}`}
        >
          Settings
        </button>
      </section>

      {showSettings && (
        <section className="flex flex-col gap-2.5 rounded-3xl border border-line bg-panel p-3 shadow-lg short:gap-1.5 short:p-2">
          <div className="flex flex-wrap gap-2">
            <Segmented
              className="min-w-[12rem] flex-1"
              options={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
              ]}
              value={settings.quality}
              onChange={(quality: Quality) => update({ quality })}
            />
            <Segmented
              className="min-w-[16rem] flex-1"
              options={(['closed', 'rootless', 'shell'] as FlowStyle[]).map((s) => ({ value: s, label: STYLE_LABELS[s] }))}
              value={settings.style}
              onChange={(style: FlowStyle) => update({ style })}
            />
          </div>
          <div>
            <h2 className="mb-1.5 text-xs font-black tracking-wide text-muted uppercase">Order of keys</h2>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ORDER_LABELS) as KeyOrder[]).map((o) => (
                <Chip key={o} on={settings.order === o} onClick={() => update({ order: o })}>
                  {ORDER_LABELS[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-1.5 text-xs font-black tracking-wide text-muted uppercase">Start key</h2>
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
              {ALL_PCS.map((pc) => (
                <Chip key={pc} on={settings.startPc === pc} onClick={() => update({ startPc: pc })}>
                  {noteName(keyNote(settings.quality, pc))}
                  {settings.quality === 'minor' ? 'm' : ''}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-[14rem] flex-1 items-center gap-3 rounded-2xl bg-ink/60 px-3 py-2">
              <span className="text-sm font-black whitespace-nowrap">{settings.bpm} BPM</span>
              <input
                type="range"
                min={40}
                max={200}
                step={5}
                value={settings.bpm}
                onChange={(e) => setSettings((s) => ({ ...s, bpm: Number(e.target.value) }))}
                className="w-full accent-[#ff5ca8]"
              />
            </label>
            <Segmented
              options={[
                { value: 4, label: '1 bar per chord' },
                { value: 2, label: '2 beats' },
              ]}
              value={settings.beatsPerChord}
              onChange={(beatsPerChord: 4 | 2) => update({ beatsPerChord })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Switch
              on={settings.click}
              onClick={() => setSettings((s) => ({ ...s, click: !s.click }))}
              label="Metronome"
              hint="Click on every beat, with a 1-bar count-in"
            />
            <Switch
              on={settings.bass}
              onClick={() => setSettings((s) => ({ ...s, bass: !s.bass }))}
              label="Bass note"
              hint="Play the root under rootless voicings"
            />
          </div>
        </section>
      )}

      {/* Chord strip */}
      <section className="rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
        <div className="mb-2 flex items-center justify-between px-1 text-xs font-black text-muted short:mb-1">
          <span>
            Key {keyIndex + 1} / {keyCount} · {keyLabel(settings.quality, current.keyPc)}
          </span>
          {settings.mode === 'listen' && (
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className={`h-2 w-2 rounded-full ${beatInBar === b ? (b === 0 ? 'bg-accent-2' : 'bg-white') : 'bg-line'}`}
                />
              ))}
            </span>
          )}
        </div>
        <div className="flex items-stretch gap-1.5">
          {keyChords.map((c, i) => {
            const at = keyIndex * 3 + i
            const active = at === index && !finished
            return (
              <button
                key={at}
                type="button"
                onClick={() => goTo(at)}
                className={`flex flex-1 flex-col items-center rounded-2xl px-2 py-1.5 transition-colors short:py-1 ${
                  active ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow' : 'bg-ink/60 hover:bg-panel-2'
                }`}
              >
                <span className="text-[10px] font-black tracking-widest opacity-70">
                  {/* Roman numerals keep their case: ii is minor. */}
                  {c.degree}
                  {c.degree === 'I' ? (settings.beatsPerChord === 4 ? ' · 2 BARS' : ' · 1 BAR') : ''}
                </span>
                <span className="text-xl font-black short:text-lg">{c.symbol}</span>
              </button>
            )
          })}
          {nextChord && (
            <div className="hidden flex-col items-center justify-center rounded-2xl px-2 text-muted sm:flex">
              <span className="text-[10px] font-black tracking-widest uppercase">next</span>
              <span className="font-black">→ {nextChord.symbol}</span>
            </div>
          )}
        </div>
      </section>

      {finished ? (
        <section className="rounded-3xl border border-line bg-panel p-4 shadow-lg">
          <p className="text-xs font-black tracking-widest text-muted uppercase">Round complete</p>
          <p className="mt-1 text-2xl font-black">
            {keyCount === 1 ? '1 key' : `${keyCount} keys`} done 🎉
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.order === 'wholeSteps' && (
              <button
                type="button"
                onClick={() => update({ startPc: nextStart })}
                className={`${btn} bg-gradient-to-br from-accent to-accent-2 px-5 shadow`}
              >
                Next round: start on {keyLabel(settings.quality, nextStart)}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                reset()
                setRoundId((n) => n + 1)
              }}
              className={`${btn} bg-panel-2`}
            >
              {settings.order === 'random' ? 'New random round' : 'Play this round again'}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
          {settings.mode === 'practise' && settings.answer === 'screen' ? (
            <TapAnswer
              key={step}
              voicing={current.voicing}
              labelMode={labelMode}
              onLabelModeChange={setLabelMode}
              freePractice
              range={range}
              context={previous ? previous.voicing.notes.filter((n) => !n.isBass).map((n) => ({ midi: n.midi, label: '', color: PREVIOUS })) : []}
              onDone={advance}
              disabled={showSettings}
            />
          ) : (
            <>
              <PianoKeyboard
                low={range.low}
                high={range.high}
                highlights={highlights}
                onKeyPress={(m) => playChord([m])}
                className="block max-h-[45dvh] w-full short:max-h-[40dvh]"
              />
              <div className="mt-2 flex min-h-4 flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-muted short:mt-1">
                {showCurrent ? (
                  <>
                    {legend.map((k) => (
                      <span key={k} className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLORS[k] }} />
                        {ROLE_LABELS[k]}
                      </span>
                    ))}
                    {previous && <span>· = common tone · ↓½ ↑1 how far a voice moves</span>}
                  </>
                ) : (
                  previous && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full" style={{ background: PREVIOUS }} />
                      Previous chord: {previous.symbol}. Now play {current.symbol}.
                    </span>
                  )
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-end gap-2 short:mt-1">
                {showCurrent && <LabelToggle value={labelMode} onChange={setLabelMode} />}
                {settings.mode === 'listen' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => goTo(index - 1)}
                      disabled={index === 0}
                      aria-label="Previous chord"
                      className={`${btn} bg-panel-2`}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo(index + 1)}
                      disabled={index + 1 >= flow.length}
                      aria-label="Next chord"
                      className={`${btn} bg-panel-2`}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={playing ? stop : play}
                      className={`${btn} flex items-center gap-1.5 bg-gradient-to-br from-accent to-accent-2 px-5 shadow`}
                    >
                      {playing ? (
                        '■ Stop'
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4" /> Play
                        </>
                      )}
                      <Kbd>Space</Kbd>
                    </button>
                  </>
                ) : revealed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => playChord(soundingNotes(current, settings.bass))}
                      aria-label="Play again"
                      className={`${btn} bg-panel-2`}
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={advance} className={`${btn} bg-[#38d9a9] px-5 text-ink`}>
                      Next
                      <Kbd>→</Kbd>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={reveal}
                    className={`${btn} w-full bg-gradient-to-br from-accent to-accent-2 px-5 shadow sm:w-auto`}
                  >
                    Show {current.symbol}
                    <Kbd>Space</Kbd>
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Kbd } from '../components/Controls'
import { DeckSettingsPanel } from '../components/DeckSettingsPanel'
import { Segmented } from '../components/Segmented'
import { VoicingKeyboard } from '../components/VoicingKeyboard'
import { type Card, cardPool, cardTitle, dealCards, DEFAULT_SETTINGS, type DeckSettings } from '../flashcards/deck'
import {
  type AnswerMode,
  type Attempt,
  elapsedMs,
  type Format,
  formatMs,
  isBetter,
  isFinished,
  MINUTE_MS,
  recordKey,
  scoreOf,
  slowest,
  SPRINT_SIZE,
} from '../speed/session'
import { load, local, save } from '../storage'
import { CHORD_TYPES, rootFor } from '../theory/chords'
import { buildVoicing } from '../theory/voicings'
import { TapAnswer } from './TapAnswer'

type Phase = 'setup' | 'countdown' | 'running' | 'reveal' | 'done'

interface SpeedPrefs {
  format: Format
  mode: AnswerMode
  settings: DeckSettings
}

const PREFS_KEY = 'pianotrainer.speed.prefs'
const RECORDS_KEY = 'pianotrainer.speed.records'
const DEFAULT_PREFS: SpeedPrefs = { format: 'sprint', mode: 'piano', settings: DEFAULT_SETTINGS }
/** Enough chords for even a very fast minute. */
const MINUTE_CARDS = 120

const cardVoicing = (c: Card) => buildVoicing(rootFor(CHORD_TYPES[c.chordId], c.rootPc), c.chordId, c.style, c.variant)
const scoreText = (format: Format, score: number) =>
  format === 'sprint' ? formatMs(score) : `${score} chord${score === 1 ? '' : 's'}`

export function Speed() {
  const [prefs, setPrefs] = useState<SpeedPrefs>(() => ({ ...DEFAULT_PREFS, ...load<SpeedPrefs>(local, PREFS_KEY) }))
  useEffect(() => save(local, PREFS_KEY, prefs), [prefs])
  const [records, setRecords] = useState<Record<string, number>>(() => load(local, RECORDS_KEY) ?? {})
  const { format, mode, settings } = prefs
  const pool = useMemo(() => cardPool(settings), [settings])
  const key = recordKey(format, mode, settings)
  const best = records[key] as number | undefined

  const [phase, setPhase] = useState<Phase>('setup')
  const [showSettings, setShowSettings] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [cards, setCards] = useState<Card[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [newRecord, setNewRecord] = useState(false)
  // Time on the current chord: counted from cardStart, paused while self-marking at the piano.
  const cardStart = useRef(0)
  const [cardMs, setCardMs] = useState(0)
  const [now, setNow] = useState(0)

  const current = cards[attempts.length]
  const voicing = current ? cardVoicing(current) : null
  const title = current ? cardTitle(current) : null

  // ---- Flow of a round -----------------------------------------------------------------
  const start = useCallback(() => {
    if (!pool.length) return
    setShowSettings(false)
    setCards(dealCards(pool, format === 'sprint' ? SPRINT_SIZE : MINUTE_CARDS))
    setAttempts([])
    setNewRecord(false)
    setCountdown(3)
    setPhase('countdown')
  }, [pool, format])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) {
      cardStart.current = performance.now()
      setPhase('running')
      return
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 800)
    return () => window.clearTimeout(t)
  }, [phase, countdown])

  const finish = useCallback(
    (all: Attempt[]) => {
      const score = scoreOf(format, all)
      if (isBetter(format, score, best)) {
        // A record needs at least one right chord in a minute.
        if (format === 'sprint' || score > 0) {
          const next = { ...records, [key]: score }
          setRecords(next)
          save(local, RECORDS_KEY, next)
          setNewRecord(true)
        }
      }
      setPhase('done')
    },
    [format, best, records, key],
  )

  const record = useCallback(
    (ms: number, wrong: boolean) => {
      const all = [...attempts, { card: current, ms, wrong }]
      setAttempts(all)
      cardStart.current = performance.now()
      if (isFinished(format, all)) finish(all)
      else setPhase('running')
    },
    [attempts, current, format, finish],
  )

  // Clock: redraw ten times a second; end a minute the moment it runs out.
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const t = performance.now()
      setNow(t)
      if (format === 'minute' && isFinished('minute', attempts, t - cardStart.current)) finish(attempts)
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, format, attempts, finish])

  const pianoDone = useCallback(() => {
    if (phase !== 'running') return
    setCardMs(performance.now() - cardStart.current)
    setPhase('reveal')
  }, [phase])

  const onScreenDone = useCallback(
    (gotIt: boolean) => record(performance.now() - cardStart.current, !gotIt),
    [record],
  )

  const stop = () => setPhase('setup')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || showSettings) return
      const press = (fn: () => void) => {
        e.preventDefault()
        fn()
      }
      if ((phase === 'setup' || phase === 'done') && (e.key === ' ' || e.key === 'Enter')) press(start)
      else if (phase === 'running' && mode === 'piano' && (e.key === ' ' || e.key === 'Enter')) press(pianoDone)
      else if (phase === 'reveal' && e.key === 'ArrowRight') press(() => record(cardMs, false))
      else if (phase === 'reveal' && e.key === 'ArrowLeft') press(() => record(cardMs, true))
      else if ((phase === 'running' || phase === 'reveal' || phase === 'countdown') && e.key === 'Escape') press(stop)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- Display ---------------------------------------------------------------------------
  const running = phase === 'running' || phase === 'reveal'
  const liveCardMs = phase === 'running' ? Math.max(0, now - cardStart.current) : phase === 'reveal' ? cardMs : 0
  const used = elapsedMs(attempts, liveCardMs)
  const clock = format === 'sprint' ? formatMs(used) : formatMs(Math.max(0, MINUTE_MS - used))
  const rightSoFar = attempts.filter((a) => !a.wrong).length
  const btn = 'rounded-2xl px-4 py-2 text-sm font-black active:scale-95 short:py-1.5'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-3 sm:p-4 short:gap-2 short:p-2">
      {(phase === 'setup' || phase === 'done') && (
        <>
          <section className="flex flex-col gap-2.5 rounded-3xl border border-line bg-panel p-3 shadow-lg short:gap-2 short:rounded-2xl short:p-2">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                className="min-w-[16rem] flex-1"
                options={[
                  { value: 'sprint', label: `Sprint · ${SPRINT_SIZE} chords` },
                  { value: 'minute', label: 'One minute' },
                ]}
                value={format}
                onChange={(f: Format) => setPrefs((p) => ({ ...p, format: f }))}
              />
              <Segmented
                className="min-w-[12rem] flex-1"
                options={[
                  { value: 'piano', label: 'At piano' },
                  { value: 'screen', label: 'On screen' },
                ]}
                value={mode}
                onChange={(m: AnswerMode) => setPrefs((p) => ({ ...p, mode: m }))}
              />
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                aria-expanded={showSettings}
                className={`${btn} ${showSettings ? 'bg-accent/30' : 'bg-panel-2'}`}
              >
                Chords
              </button>
            </div>
            <p className="px-1 text-sm text-body">
              {format === 'sprint'
                ? `Play ${SPRINT_SIZE} chords as fast as you can. Lowest time wins.`
                : 'Play as many chords as you can in 60 seconds.'}{' '}
              {mode === 'piano'
                ? 'Press Done as soon as your hands are on the chord, then mark it right or wrong (wrong: +3 s).'
                : 'Tap the chord and Check; fix mistakes while the clock runs.'}
            </p>
          </section>

          {showSettings && (
            <DeckSettingsPanel
              settings={settings}
              onChange={(s) => setPrefs((p) => ({ ...p, settings: s }))}
              note={`${pool.length} different chords · each choice keeps its own record.`}
            />
          )}

          {phase === 'done' ? (
            <Results format={format} attempts={attempts} best={records[key]} newRecord={newRecord} onAgain={start} />
          ) : (
            <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-panel p-6 text-center shadow-lg short:p-4">
              <p className="text-xs font-black tracking-widest text-muted uppercase">Personal best</p>
              <p className="text-3xl font-black tabular-nums">{best === undefined ? '—' : scoreText(format, best)}</p>
              {pool.length === 0 ? (
                <p className="text-sm text-danger">Pick at least one chord type and one root under Chords.</p>
              ) : (
                <button type="button" onClick={start} className="rounded-2xl bg-brand px-8 py-3 text-lg font-black shadow active:scale-95">
                  Start
                  <Kbd>Space</Kbd>
                </button>
              )}
            </section>
          )}
        </>
      )}

      {phase === 'countdown' && (
        <section className="flex min-h-[50dvh] flex-col items-center justify-center rounded-3xl border border-line bg-panel shadow-lg">
          <p className="text-xs font-black tracking-widest text-muted uppercase">Get ready</p>
          <p key={countdown} className="animate-pulse text-8xl font-black text-accent-soft tabular-nums">
            {countdown || 'Go!'}
          </p>
        </section>
      )}

      {running && current && title && voicing && (
        <>
          <section className="flex items-center gap-3 rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
            <p className="text-3xl font-black tabular-nums short:text-2xl" aria-live="off">
              {clock}
            </p>
            <p className="flex-1 text-sm font-bold text-muted">
              {format === 'sprint' ? `Chord ${attempts.length + 1} / ${SPRINT_SIZE}` : `✓ ${rightSoFar} right`}
              {attempts.some((a) => a.wrong) && <span className="text-danger"> · +{formatMs(attempts.filter((a) => a.wrong).length * 3000)}</span>}
            </p>
            <button type="button" onClick={stop} className={`${btn} bg-panel-2`}>
              Stop
              <Kbd>Esc</Kbd>
            </button>
          </section>

          <section className="rounded-3xl border border-line bg-panel p-3 text-center shadow-lg short:rounded-2xl short:p-2">
            <p className="flex flex-wrap items-baseline justify-center gap-x-3">
              <span className="text-4xl font-black short:text-3xl">{title.symbol}</span>
              <span className="text-xl font-black text-accent-2 short:text-lg">{title.name}</span>
              <span className="w-full text-sm font-bold text-muted short:w-auto">({title.detail})</span>
            </p>
          </section>

          <section className="rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
            {mode === 'screen' ? (
              <TapAnswer
                key={attempts.length}
                voicing={voicing}
                labelMode="degree"
                onLabelModeChange={() => {}}
                onDone={onScreenDone}
                speed
              />
            ) : (
              <>
                <VoicingKeyboard
                  voicing={phase === 'reveal' ? voicing : null}
                  labelMode="degree"
                  keyboardClassName="max-h-[45dvh] short:max-h-[40dvh]"
                />
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2 short:mt-1">
                  {phase === 'reveal' ? (
                    <>
                      <span className="mr-auto text-sm font-bold text-muted">{formatMs(cardMs)} · was it right?</span>
                      <button type="button" onClick={() => record(cardMs, true)} className={`${btn} bg-danger/20 text-danger`}>
                        Wrong (+3 s)
                        <Kbd>←</Kbd>
                      </button>
                      <button type="button" onClick={() => record(cardMs, false)} className={`${btn} bg-success px-5 text-ink`}>
                        Right
                        <Kbd>→</Kbd>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={pianoDone}
                      className="w-full rounded-2xl bg-brand px-5 py-3 text-lg font-black shadow active:scale-[0.98] short:py-2 sm:w-auto"
                    >
                      Done
                      <Kbd>Space</Kbd>
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

interface ResultsProps {
  format: Format
  attempts: Attempt[]
  best: number | undefined
  newRecord: boolean
  onAgain: () => void
}

function Results({ format, attempts, best, newRecord, onAgain }: ResultsProps) {
  const score = scoreOf(format, attempts)
  const wrong = attempts.filter((a) => a.wrong).length
  return (
    <section className="rounded-3xl border border-line bg-panel p-4 shadow-lg">
      <p className="text-xs font-black tracking-widest text-muted uppercase">
        {format === 'sprint' ? 'Sprint complete' : "Time's up"}
      </p>
      <p className="mt-1 text-4xl font-black tabular-nums">{scoreText(format, score)}</p>
      {newRecord ? (
        <p className="mt-1 font-black text-warning">🏆 New record!</p>
      ) : (
        best !== undefined && <p className="mt-1 text-sm font-bold text-muted">Personal best: {scoreText(format, best)}</p>
      )}
      {wrong > 0 && (
        <p className="mt-1 text-sm font-bold text-danger">
          {wrong} wrong · +{formatMs(wrong * 3000)} penalty
        </p>
      )}
      {attempts.length > 0 && (
        <>
          <h2 className="mt-4 text-sm font-black">Slowest chords</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {slowest(attempts).map((a, i) => {
              const t = cardTitle(a.card)
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2 rounded-xl bg-ink/60 px-3 py-1.5">
                  <span className="font-black">{t.symbol}</span>
                  <span className="font-bold text-accent-2">{t.name}</span>
                  <span className="ml-auto font-black tabular-nums text-warning">{formatMs(a.ms)}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <button type="button" onClick={onAgain} className="mt-4 rounded-2xl bg-brand px-6 py-2.5 font-black shadow active:scale-95">
        Again
        <Kbd>Space</Kbd>
      </button>
    </section>
  )
}

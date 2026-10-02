import { useCallback, useEffect, useMemo, useState } from 'react'
import { playChord } from '../audio/piano'
import { PlayIcon } from '../components/Icons'
import { LabelToggle, type LabelMode, VoicingKeyboard } from '../components/VoicingKeyboard'
import {
  ALL_ROOTS,
  answer,
  type Card,
  cardPool,
  cardTitle,
  DEFAULT_SETTINGS,
  type DeckSettings,
  EASY_ROOTS,
  hardestCards,
  isFinished,
  repeatsLeft,
  newRound,
  type Round,
  ROUND_SIZE,
} from '../flashcards/deck'
import { CHORD_ORDER, CHORD_TYPES, type ChordId, rootFor } from '../theory/chords'
import { noteName } from '../theory/notes'
import { buildVoicing } from '../theory/voicings'
import { TapAnswer } from './TapAnswer'
import { Segmented } from '../components/Segmented'
import { Chip, Kbd, Switch } from '../components/Controls'
import { load, local, save, session } from '../storage'

// Settings survive visits (localStorage); the running round lives as long as the tab (sessionStorage).
const SETTINGS_KEY = 'pianotrainer.flashcards.settings'
const ROUND_KEY = 'pianotrainer.flashcards.round'
const MODE_KEY = 'pianotrainer.flashcards.mode'

/** "piano": play on your own piano, then reveal. "screen": build the chord on the on-screen keyboard. */
type AnswerMode = 'piano' | 'screen'


const cardVoicing = (c: Card) => buildVoicing(rootFor(CHORD_TYPES[c.chordId], c.rootPc), c.chordId, c.style, c.variant)

export function Flashcards() {
  const [settings, setSettings] = useState<DeckSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...load<DeckSettings>(local, SETTINGS_KEY),
  }))
  const pool = useMemo(() => cardPool(settings), [settings])
  const [round, setRound] = useState<Round>(() => load<Round>(session, ROUND_KEY) ?? newRound(pool))
  const [revealed, setRevealed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [labelMode, setLabelMode] = useState<LabelMode>('degree')
  // Bumped per answered card so the on-screen answer starts fresh, even when a card repeats.
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<AnswerMode>(() => load<AnswerMode>(local, MODE_KEY) ?? 'piano')

  useEffect(() => save(local, SETTINGS_KEY, settings), [settings])
  useEffect(() => save(session, ROUND_KEY, round), [round])
  useEffect(() => save(local, MODE_KEY, mode), [mode])

  const current = round.queue[0]
  const voicing = current ? cardVoicing(current.card) : null
  const finished = isFinished(round)

  const updateSettings = (next: DeckSettings) => {
    setStep((n) => n + 1)
    setSettings(next)
    setRound(newRound(cardPool(next)))
    setRevealed(false)
  }
  const restart = () => {
    setStep((n) => n + 1)
    setRound(newRound(pool))
    setRevealed(false)
  }
  const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

  const reveal = useCallback(() => {
    if (!voicing) return
    setRevealed(true)
    playChord(voicing.notes.map((n) => n.midi))
  }, [voicing])

  const respond = useCallback(
    (gotIt: boolean) => {
      if (!revealed) return
      setRound((r) => answer(r, gotIt))
      setRevealed(false)
    },
    [revealed],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || showSettings || finished || mode !== 'piano') return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) reveal()
        else if (voicing) playChord(voicing.notes.map((n) => n.midi))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        respond(true)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        respond(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, reveal, respond, voicing, showSettings, finished, mode])

  const title = current ? cardTitle(current.card) : null
  const progress = Math.min(round.answered + (current && !current.retry ? 1 : 0), ROUND_SIZE)
  const toRepeat = repeatsLeft(round)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 p-3 sm:p-4 short:gap-2 short:p-2">
      {/* Status bar */}
      <section className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
        <div className="min-w-[9rem] flex-1 px-1">
          <div className="flex justify-between text-xs font-black whitespace-nowrap text-muted">
            <span>
              Card {progress} / {ROUND_SIZE}
              {toRepeat > 0 && <span className="text-[#ffc233]"> · {toRepeat} to repeat</span>}
            </span>
            <span className="text-[#38d9a9]">✓ {round.correct}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
              style={{ width: `${(round.answered / ROUND_SIZE) * 100}%` }}
            />
          </div>
        </div>
        <Segmented
          className="order-last w-full sm:order-none sm:w-auto"
          options={[
            { value: 'piano', label: 'At piano' },
            { value: 'screen', label: 'On screen' },
          ]}
          value={mode}
          onChange={(m: AnswerMode) => {
            setMode(m)
            setRevealed(false)
          }}
        />
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          aria-expanded={showSettings}
          className={`rounded-2xl px-3 py-2 text-sm font-black short:py-1.5 ${showSettings ? 'bg-accent/30' : 'bg-panel-2'}`}
        >
          Settings
        </button>
      </section>

      {showSettings && (
        <section className="flex flex-col gap-2.5 rounded-3xl border border-line bg-panel p-3 shadow-lg short:gap-1.5 short:p-2">
          <div>
            <h2 className="mb-1.5 text-xs font-black tracking-wide text-muted uppercase">Chord types</h2>
            <div className="flex flex-wrap gap-1.5">
              {CHORD_ORDER.map((id: ChordId) => (
                <Chip
                  key={id}
                  on={settings.chords.includes(id)}
                  onClick={() => updateSettings({ ...settings, chords: toggleIn(settings.chords, id) })}
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
                onClick={() => updateSettings({ ...settings, roots: ALL_ROOTS })}
                className="rounded-lg bg-panel-2 px-2 py-0.5 text-xs font-black"
              >
                All 12
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ ...settings, roots: EASY_ROOTS })}
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
                  onClick={() => updateSettings({ ...settings, roots: toggleIn(settings.roots, pc) })}
                >
                  {noteName(rootFor(CHORD_TYPES['7'], pc))}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Switch
              on={settings.inversions}
              onClick={() => updateSettings({ ...settings, inversions: !settings.inversions })}
              label="Inversions"
              hint="1st, 2nd and 3rd inversion"
            />
            <Switch
              on={settings.voicings}
              onClick={() => updateSettings({ ...settings, voicings: !settings.voicings })}
              label="Voicings"
              hint="Shell, Rootless A/B, Drop-2"
            />
          </div>
          <p className="text-xs font-bold text-muted">
            {pool.length} different cards · changing a setting starts a new round.
          </p>
        </section>
      )}

      {pool.length === 0 ? (
        <section className="rounded-3xl border border-line bg-panel p-6 text-center shadow-lg">
          <p className="font-black">No cards to practise.</p>
          <p className="mt-1 text-sm text-muted">Pick at least one chord type and one root in Settings.</p>
        </section>
      ) : finished ? (
        <Summary round={round} onRestart={restart} />
      ) : (
        title &&
        current && (
          <>
            {/* Assignment */}
            <section className="rounded-3xl border border-line bg-panel p-3 text-center shadow-lg short:rounded-2xl short:p-2">
              <p className="text-xs font-black tracking-widest text-muted uppercase short:hidden">
                {current.retry ? 'Practice again' : 'Play'}
              </p>
              <p className="flex flex-wrap items-baseline justify-center gap-x-3">
                {current.retry && (
                  <span className="hidden text-xs font-black text-[#ff8f8f] uppercase short:inline">Again</span>
                )}
                <span className="text-4xl font-black short:text-3xl">{title.symbol}</span>
                <span className="text-xl font-black text-accent-2 short:text-lg">{title.name}</span>
                <span className="w-full text-sm font-bold text-muted short:w-auto">
                  ({title.detail})
                </span>
              </p>
            </section>

            {/* Keyboard */}
            <section className="rounded-3xl border border-line bg-panel p-2.5 shadow-lg short:rounded-2xl short:p-1.5">
              {mode === 'screen' && voicing ? (
                <TapAnswer
                  key={step}
                  voicing={voicing}
                  labelMode={labelMode}
                  onLabelModeChange={setLabelMode}
                  isRepeat={current.retry}
                  disabled={showSettings}
                  onDone={(gotIt) => {
                    setRound((r) => answer(r, gotIt))
                    setStep((n) => n + 1)
                  }}
                />
              ) : (
                <>
                <VoicingKeyboard
                  voicing={revealed ? voicing : null}
                  labelMode={labelMode}
                  keyboardClassName="max-h-[45dvh] short:max-h-[40dvh]"
                />
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2 short:mt-1">
                  {revealed ? (
                    <>
                      <LabelToggle value={labelMode} onChange={setLabelMode} />
                      <button
                        type="button"
                        onClick={() => voicing && playChord(voicing.notes.map((n) => n.midi))}
                        aria-label="Play again"
                        className="rounded-2xl bg-panel-2 px-3 py-2 active:scale-95 short:py-1.5"
                      >
                        <PlayIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(false)}
                        className="rounded-2xl bg-[#ff6b6b]/20 px-4 py-2 text-sm font-black text-[#ff8f8f] active:scale-95 short:py-1.5"
                      >
                        Practice again
                        <Kbd>←</Kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(true)}
                        className="rounded-2xl bg-[#38d9a9] px-5 py-2 text-sm font-black text-ink active:scale-95 short:py-1.5"
                      >
                        Got it
                        <Kbd>→</Kbd>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={reveal}
                      className="w-full rounded-2xl bg-gradient-to-br from-accent to-accent-2 px-5 py-2.5 text-base font-black shadow active:scale-[0.98] short:py-1.5 sm:w-auto"
                    >
                      Show solution
                      <Kbd>Space</Kbd>
                    </button>
                  )}
                </div>
                </>
              )}
            </section>
          </>
        )
      )}
    </div>
  )
}

function Summary({ round, onRestart }: { round: Round; onRestart: () => void }) {
  const hard = hardestCards(round)
  const pct = Math.round((round.correct / ROUND_SIZE) * 100)
  return (
    <section className="rounded-3xl border border-line bg-panel p-4 shadow-lg">
      <p className="text-xs font-black tracking-widest text-muted uppercase">Round complete</p>
      <p className="mt-1 text-4xl font-black">
        {round.correct} / {ROUND_SIZE}
        <span className="ml-2 text-lg text-muted">first try · {pct}%</span>
      </p>
      {hard.length > 0 ? (
        <>
          <h2 className="mt-4 text-sm font-black">Hardest forms</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {hard.map(({ card, misses }) => {
              const t = cardTitle(card)
              return (
                <li key={`${card.rootPc}${card.chordId}${card.style}${card.variant}`} className="flex items-baseline gap-2 rounded-xl bg-ink/60 px-3 py-1.5">
                  <span className="font-black">{t.symbol}</span>
                  <span className="font-bold text-accent-2">{t.name}</span>
                  <span className="text-sm text-muted">({t.detail})</span>
                  <span className="ml-auto text-sm font-black text-[#ff8f8f]">×{misses}</span>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="mt-3 font-bold text-[#38d9a9]">Perfect round: everything right on the first try!</p>
      )}
      <button
        type="button"
        onClick={onRestart}
        className="mt-4 rounded-2xl bg-gradient-to-br from-accent to-accent-2 px-5 py-2.5 font-black shadow active:scale-95"
      >
        New round
      </button>
    </section>
  )
}

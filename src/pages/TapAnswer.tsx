import { useCallback, useEffect, useState } from 'react'
import { playChord, playNote } from '../audio/piano'
import { Kbd } from '../components/Controls'
import { PlayIcon } from '../components/Icons'
import { type KeyHighlight, PianoKeyboard } from '../components/PianoKeyboard'
import { ROLE_COLORS, STATUS } from '../components/roleColors'
import { colorKey, type LabelMode, LabelToggle } from '../components/VoicingKeyboard'
import { checkShape, type CheckResult } from '../flashcards/check'
import { noteName, pitchClass } from '../theory/notes'
import type { VoicedNote, Voicing } from '../theory/voicings'

/** C3–G5: the smallest window every voicing fits in, in at least one octave. */
export const TAP_RANGE = { low: 48, high: 79 }

const { success: GREEN, danger: RED, warning: AMBER, selected: SELECTED } = STATUS

type Phase = 'editing' | 'checked' | 'correct' | 'solution'

interface Props {
  voicing: Voicing
  labelMode: LabelMode
  onLabelModeChange: (m: LabelMode) => void
  /** This card is a repeat of one missed earlier in the round. */
  isRepeat?: boolean
  /**
   * Called when the card is finished. gotIt: a new card must be right on the first Check;
   * a repeat only has to be solved without Show solution (fixing it after a wrong Check counts).
   */
  onDone: (gotIt: boolean) => void
  /** Ignore keyboard shortcuts (e.g. while settings are open). */
  disabled?: boolean
  /** Free practice: no "comes back later" messages. */
  freePractice?: boolean
  /** Keys shown underneath while building, e.g. the previous chord. */
  context?: KeyHighlight[]
  /** The keyboard window; defaults to C3–G5, where every voicing fits in some octave. */
  range?: { low: number; high: number }
  /**
   * Speed Trainer: silent, a right answer moves on by itself (onDone(true)), a wrong Check only
   * marks wrong keys (no missing-key hints), and "Give up" shows the solution briefly (onDone(false)).
   */
  speed?: boolean
}

/** "On screen" answering: build the voicing by tapping keys, then check it. */
export function TapAnswer({
  voicing,
  labelMode,
  onLabelModeChange,
  isRepeat,
  onDone,
  disabled,
  freePractice,
  context = [],
  range = TAP_RANGE,
  speed = false,
}: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [result, setResult] = useState<CheckResult | null>(null)
  const [phase, setPhase] = useState<Phase>('editing')
  const [missed, setMissed] = useState(false)

  const targetNotes = voicing.notes.filter((n) => !n.isBass)
  const target = targetNotes.map((n) => n.midi)
  const bass = voicing.notes.find((n) => n.isBass)
  const rootless = Boolean(bass)
  const finished = phase === 'correct' || phase === 'solution'

  const label = (n: VoicedNote) => (labelMode === 'degree' ? n.interval.label : noteName(n.note))
  const sound = {
    note: (m: number) => !speed && playNote(m),
    chord: (ms: number[]) => !speed && playChord(ms),
  }

  // Speed Trainer: move on by itself, after a short flash of the result.
  useEffect(() => {
    if (!speed || (phase !== 'correct' && phase !== 'solution')) return
    const t = window.setTimeout(() => onDone(phase === 'correct'), phase === 'correct' ? 350 : 1500)
    return () => window.clearTimeout(t)
  }, [speed, phase, onDone])

  const tap = (midi: number) => {
    if (finished) {
      sound.note(midi)
      return
    }
    setResult(null)
    setPhase('editing')
    if (selected.includes(midi)) {
      setSelected(selected.filter((m) => m !== midi))
    } else {
      sound.note(midi)
      setSelected([...selected, midi])
    }
  }

  const undo = useCallback(() => {
    if (finished) return
    setResult(null)
    setPhase('editing')
    setSelected((sel) => sel.slice(0, -1))
  }, [finished])

  const clear = useCallback(() => {
    if (finished) return
    setResult(null)
    setPhase('editing')
    setSelected([])
  }, [finished])

  const check = useCallback(() => {
    if (finished || !selected.length) return
    const r = checkShape(target, selected, range, bass ? pitchClass(bass.note) : undefined)
    setResult(r)
    if (r.correct) {
      setPhase('correct')
      sound.chord(selected)
    } else {
      setPhase('checked')
      setMissed(true)
    }
  }, [finished, selected, target, bass])

  const showSolution = useCallback(() => {
    if (finished) return
    const r = checkShape(target, selected, range, bass ? pitchClass(bass.note) : undefined)
    setResult(r)
    setPhase('solution')
    setMissed(true)
    sound.chord(target.map((m) => m + r.shift))
  }, [finished, selected, target, bass])

  const next = useCallback(() => {
    if (finished) onDone(phase === 'correct' && (isRepeat || !missed))
  }, [finished, onDone, phase, missed, isRepeat])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return
      const actions: Record<string, () => void> = finished
        ? { Enter: next, ' ': next, ArrowRight: next }
        : { Enter: check, Backspace: undo, Escape: clear }
      const action = actions[e.key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, finished, next, check, undo, clear])

  // What the keyboard shows in each phase.
  const highlights: KeyHighlight[] = []
  const shift = result?.shift ?? 0
  const byShiftedMidi = new Map(targetNotes.map((n) => [n.midi + shift, n]))
  if (phase === 'solution') {
    for (const n of voicing.notes) {
      const midi = n.midi + shift
      if (midi >= range.low && midi <= range.high)
        highlights.push({ midi, label: label(n), color: ROLE_COLORS[colorKey(n)] })
    }
  } else if (result) {
    for (const m of selected) {
      if (m === result.ignoredBass) {
        highlights.push({ midi: m, label: bass ? label(bass) : '', color: ROLE_COLORS.bass })
      } else if (result.marks[m] === 'correct') {
        const n = byShiftedMidi.get(m)
        highlights.push({ midi: m, label: n ? label(n) : '', color: GREEN })
      } else {
        highlights.push({ midi: m, label: '✕', color: RED })
      }
    }
    for (const m of speed ? [] : result.missing) {
      const n = byShiftedMidi.get(m)
      highlights.push({ midi: m, label: n ? label(n) : '', color: AMBER, outline: true })
    }
  } else {
    for (const m of selected) highlights.push({ midi: m, label: '', color: SELECTED })
    for (const h of context) if (!selected.includes(h.midi)) highlights.push(h)
  }

  let message: React.ReactNode = rootless
    ? 'Tap the keys of the voicing. The bass note is optional.'
    : 'Tap the keys of the voicing. Tap a key again to remove it.'
  let tone = 'text-muted'
  if (phase === 'correct') {
    message = !missed
      ? 'Correct! 🎉'
      : freePractice
        ? 'Correct now!'
        : isRepeat
          ? 'Correct now! This one is done.'
          : 'Correct now! This card will come back later.'
    tone = 'text-success'
  } else if (phase === 'solution') {
    message = speed
      ? 'Here is the solution (+3 s).'
      : freePractice
        ? 'Here is the solution.'
        : 'Here is the solution. This card will come back later.'
    tone = 'text-warning'
  } else if (result) {
    const counts = Object.values(result.marks)
    const right = counts.filter((m) => m === 'correct').length
    const wrong = counts.length - right
    message = speed
      ? `Not quite: ${wrong ? `${wrong} wrong key${wrong > 1 ? 's' : ''}` : 'some keys missing'}. Keep going!`
      : `Not quite: ${right} right, ${wrong} wrong, ${result.missing.length} missing. Fix it and check again.`
    tone = 'text-danger'
  }

  const btn = 'rounded-2xl px-3.5 py-2 text-sm font-black active:scale-95 disabled:opacity-40 short:py-1.5'

  return (
    <>
      <p className="mb-2 hidden rounded-xl bg-ink/60 px-3 py-1.5 text-center text-xs font-bold text-muted portrait:max-sm:block">
        ↻ Turn your phone sideways for bigger keys.
      </p>
      <PianoKeyboard
        low={range.low}
        high={range.high}
        highlights={highlights}
        onKeyPress={tap}
        className="block max-h-[45dvh] w-full short:max-h-[40dvh]"
      />
      <p className={`mt-2 min-h-5 text-sm font-bold short:mt-1 short:text-xs ${tone}`}>{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 short:mt-1">
        {!speed && (result || finished) && <LabelToggle value={labelMode} onChange={onLabelModeChange} />}
        {speed && finished ? null : finished ? (
          <>
            <button
              type="button"
              onClick={() => playChord(highlights.map((h) => h.midi))}
              aria-label="Play again"
              className={`${btn} bg-panel-2`}
            >
              <PlayIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={next} className={`${btn} bg-success px-5 text-ink`}>
              Next
              <Kbd>→</Kbd>
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={undo} disabled={!selected.length} className={`${btn} bg-panel-2`}>
              Undo
              <Kbd>⌫</Kbd>
            </button>
            <button type="button" onClick={clear} disabled={!selected.length} className={`${btn} bg-panel-2`}>
              Clear
              <Kbd>Esc</Kbd>
            </button>
            <button type="button" onClick={showSolution} className={`${btn} bg-panel-2 text-muted`}>
              {speed ? 'Give up (+3 s)' : 'Show solution'}
            </button>
            <button
              type="button"
              onClick={check}
              disabled={!selected.length}
              className={`${btn} bg-brand px-5 shadow`}
            >
              Check
              <Kbd>Enter</Kbd>
            </button>
          </>
        )}
      </div>
    </>
  )
}

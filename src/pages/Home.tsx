import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { resetConsent } from '../analytics'
import { playChord } from '../audio/piano'
import { CardsIcon, ExplorerIcon, FlowIcon, PlayIcon, SpeedIcon } from '../components/Icons'
import { type ColorKey, ROLE_COLORS, ROLE_LABELS } from '../components/roleColors'
import { VoicingKeyboard } from '../components/VoicingKeyboard'
import { parseNote } from '../theory/notes'
import { buildVoicing } from '../theory/voicings'

interface Section {
  path: string
  title: string
  tagline: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  points: string[]
  ready: boolean
}

const SECTIONS: Section[] = [
  {
    path: '/explorer',
    title: 'Explorer',
    tagline: 'Look up & understand',
    icon: ExplorerIcon,
    points: [
      'Pick a root, a chord type and a voicing: Closed, Basic Shell, Rootless A/B or Drop-2.',
      'See every key labelled with its function (3, ♭7, 9…) or its note name, and hear it.',
      'A short explanation tells you why the voicing is built that way.',
    ],
    ready: true,
  },
  {
    path: '/flashcards',
    title: 'Flashcards',
    tagline: 'Recognition & speed',
    icon: CardsIcon,
    points: [
      'Get an assignment like “Play F7 – Rootless Form B” and try it on your own piano first.',
      'Reveal the solution to check your fingers, then mark it “Got it” or “Practice again”.',
      'Away from the piano? Switch to “On screen” and build the chord by tapping the keys.',
      'Rounds of 20 cards end with your score and the forms that need more work.',
    ],
    ready: true,
  },
  {
    path: '/flow',
    title: 'ii-V-I Flow',
    tagline: 'Voice leading',
    icon: FlowIcon,
    points: [
      'Listen and watch a ii–V–I in time, or practise it chord by chord, at the piano or on screen.',
      'Each key goes a whole step down: the I chord turns into the next ii (Cmaj7 → Cm7).',
      'Markers show which notes stay and how far the others move: = ↓½ ↑1.',
    ],
    ready: true,
  },
  {
    path: '/speed',
    title: 'Speed Trainer',
    tagline: 'Against the clock',
    icon: SpeedIcon,
    points: [
      'Find voicings as fast as you can while the clock runs.',
      'Track your times per key and chord type to spot weak spots.',
    ],
    ready: false,
  },
]

const STEPS = [
  { title: 'Explore', text: 'Study a voicing until you understand its shape.' },
  { title: 'Drill', text: 'Use flashcards until you can grab it without thinking.' },
  { title: 'Connect', text: 'Link the voicings in a ii–V–I.' },
  { title: 'Speed up', text: 'Make it automatic in every key.' },
]

const LEGEND: ColorKey[] = ['root', 'third', 'fifth', 'seventh', 'tension', 'bass']

// Dm9 as a Bill Evans rootless voicing: a taste of what the app shows.
const DEMO = buildVoicing(parseNote('D'), 'm7', 'rootless', 0)

export function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-3 sm:p-4 short:gap-3 short:p-2">
      {/* Welcome */}
      <section className="grid items-center gap-4 rounded-3xl border border-line bg-panel p-5 shadow-lg md:grid-cols-[1.1fr_1fr] landscape:grid-cols-[1.1fr_1fr] short:p-4">
        <div>
          <p className="text-xs font-black tracking-widest text-muted uppercase">Welcome to</p>
          <h1 className="mt-1 bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-4xl font-black text-transparent short:text-3xl">
            Piano Trainer
          </h1>
          <p className="mt-2 leading-relaxed text-[#d6d4f2]">
            Learn the jazz piano voicings every pianist uses, from the first shell to Bill Evans rootless voicings,
            until your hands find them without thinking.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/explorer"
              className="rounded-2xl bg-gradient-to-br from-accent to-accent-2 px-5 py-2.5 font-black shadow active:scale-95"
            >
              Start exploring
            </Link>
            <Link to="/flashcards" className="rounded-2xl bg-panel-2 px-5 py-2.5 font-black active:scale-95">
              Practise flashcards
            </Link>
          </div>
        </div>
        <div className="rounded-2xl bg-ink/50 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-black">
              Dm9 <span className="font-bold text-muted">· Rootless Form A</span>
            </span>
            <button
              type="button"
              onClick={() => playChord(DEMO.notes.map((n) => n.midi))}
              aria-label="Play Dm9"
              className="rounded-xl bg-gradient-to-br from-accent to-accent-2 p-2 active:scale-95"
            >
              <PlayIcon className="h-4 w-4" />
            </button>
          </div>
          <VoicingKeyboard voicing={DEMO} labelMode="degree" keyboardClassName="max-h-44" />
        </div>
      </section>

      {/* Sections */}
      <section className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ path, title, tagline, icon: Icon, points, ready }) => (
          <Link
            key={path}
            to={path}
            className="group flex flex-col rounded-3xl border border-line bg-panel p-4 shadow-lg transition-colors hover:border-accent/60"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-gradient-to-br from-accent/30 to-accent-2/30 p-2.5">
                <Icon className="h-6 w-6 text-accent-2" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg leading-tight font-black">{title}</h2>
                <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{tagline}</p>
              </div>
              {!ready && (
                <span className="rounded-full bg-accent-2/20 px-2.5 py-1 text-[10px] font-black tracking-wide text-accent-2 uppercase">
                  Soon
                </span>
              )}
            </div>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-[#d6d4f2]">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            {ready && (
              <span className="mt-3 text-sm font-black text-accent-2 group-hover:underline">Open {title} →</span>
            )}
          </Link>
        ))}
      </section>

      {/* How to practise + colours */}
      <section className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-line bg-panel p-4 shadow-lg">
          <h2 className="font-black">How to practise</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-2xl bg-ink/50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-sm font-black">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-black">{s.title}</span>
                  <span className="block text-sm text-muted">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl border border-line bg-panel p-4 shadow-lg">
          <h2 className="font-black">Key colours</h2>
          <p className="mt-1 text-sm text-muted">Every lit key is coloured by its role in the chord.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {LEGEND.map((k) => (
              <li key={k} className="flex items-center gap-2 text-sm font-bold">
                <span className="h-4 w-4 rounded-full" style={{ background: ROLE_COLORS[k] }} />
                {ROLE_LABELS[k]}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="pb-2 text-center text-xs text-muted">
        Visits are counted with Google Analytics, only if you accept cookies.{' '}
        <button
          type="button"
          onClick={() => {
            resetConsent()
            window.dispatchEvent(new Event('pianotrainer:consent'))
          }}
          className="font-bold underline hover:text-white"
        >
          Cookie settings
        </button>
      </p>
    </div>
  )
}

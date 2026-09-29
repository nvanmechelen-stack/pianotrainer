import { Navigate, Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { Explorer } from './pages/Explorer'
import { ComingSoon } from './pages/ComingSoon'

export default function App() {
  return (
    <div className="flex h-dvh flex-col landscape:flex-row md:flex-row">
      <NavBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/explorer" replace />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route
            path="/flashcards"
            element={
              <ComingSoon
                title="Flashcards"
                intro="Quick recall of voicings, one card at a time."
                points={[
                  'A card shows a chord and voicing, e.g. “E♭m7 · Rootless B”.',
                  'Play or tap the notes on the keyboard, or flip the card to check.',
                  'Cards you miss come back sooner (spaced repetition) across all 12 keys.',
                ]}
              />
            }
          />
          <Route
            path="/flow"
            element={
              <ComingSoon
                title="ii-V-I Flow"
                intro="Voice leading through the most important progression in jazz."
                points={[
                  'Step through ii–V–I in major and minor, in all 12 keys.',
                  'Rootless voicings alternate A → B → A, so you see how little the hand moves.',
                  'Play-along with an adjustable tempo.',
                ]}
              />
            }
          />
          <Route
            path="/speed"
            element={
              <ComingSoon
                title="Speed Trainer"
                intro="Against the clock: how fast can you find the voicing?"
                points={[
                  'Random chord symbols appear; find the voicing as fast as you can.',
                  'Times are tracked per key and chord type so you can see your weak spots.',
                  'Later: MIDI input from a real keyboard.',
                ]}
              />
            }
          />
          <Route path="*" element={<Navigate to="/explorer" replace />} />
        </Routes>
      </main>
    </div>
  )
}

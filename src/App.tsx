import { Navigate, Route, Routes } from 'react-router-dom'
import { ConsentBanner } from './components/ConsentBanner'
import { NavBar } from './components/NavBar'
import { Explorer } from './pages/Explorer'
import { ComingSoon } from './pages/ComingSoon'
import { Flashcards } from './pages/Flashcards'
import { Flow } from './pages/Flow'
import { Home } from './pages/Home'

export default function App() {
  return (
    <div className="flex h-dvh flex-col landscape:flex-row md:flex-row">
      <NavBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/flow" element={<Flow />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ConsentBanner />
    </div>
  )
}

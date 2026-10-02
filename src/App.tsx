import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ConsentBanner } from './components/ConsentBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NavBar } from './components/NavBar'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { applyPageMeta, NOT_FOUND, PAGES } from './seo'

// Each tab is loaded when it is first opened, so the start page appears faster.
const Explorer = lazy(() => import('./pages/Explorer').then((m) => ({ default: m.Explorer })))
const Flashcards = lazy(() => import('./pages/Flashcards').then((m) => ({ default: m.Flashcards })))
const Flow = lazy(() => import('./pages/Flow').then((m) => ({ default: m.Flow })))
const Speed = lazy(() => import('./pages/Speed').then((m) => ({ default: m.Speed })))

function Loading() {
  return (
    <div className="flex min-h-full items-center justify-center p-8 text-sm font-bold text-muted" role="status">
      Loading…
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => applyPageMeta(PAGES[pathname] ?? NOT_FOUND), [pathname])

  return (
    <div className="flex h-dvh flex-col landscape:flex-row md:flex-row">
      <NavBar />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/flow" element={<Flow />} />
              <Route path="/speed" element={<Speed />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <ConsentBanner />
    </div>
  )
}

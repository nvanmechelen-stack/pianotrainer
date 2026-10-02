import { useEffect, useState } from 'react'
import { getConsent, setConsent, startAnalytics } from '../analytics'

/** A minimal cookie banner: analytics only starts after "Accept". */
export function ConsentBanner() {
  const [open, setOpen] = useState(() => getConsent() === null)

  useEffect(() => {
    // Returning visitors who accepted earlier: start once the app is idle.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(() => void startAnalytics())
  }, [])

  // Lets the Home page reopen the banner ("Cookie settings").
  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener('pianotrainer:consent', reopen)
    return () => window.removeEventListener('pianotrainer:consent', reopen)
  }, [])

  if (!open) return null
  const choose = (c: 'granted' | 'denied') => {
    setConsent(c)
    setOpen(false)
  }
  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed inset-x-2 bottom-2 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel/95 p-3 text-sm shadow-2xl backdrop-blur portrait:bottom-24 md:portrait:bottom-2"
    >
      <p className="min-w-0 flex-1 text-[#d6d4f2]">
        🍪 This site uses Google Analytics cookies only to count visits. Nothing else is tracked.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => choose('denied')} className="rounded-xl bg-panel-2 px-3 py-1.5 font-black">
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="rounded-xl bg-gradient-to-br from-accent to-accent-2 px-3 py-1.5 font-black shadow"
        >
          Accept
        </button>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { PianoKeyboard } from '../components/PianoKeyboard'
import { STATUS } from '../components/roleColors'

/** 404: a wrong note on a little keyboard, and a way back home. */
export function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center p-4">
      <div className="rounded-3xl border border-line bg-panel p-6 text-center shadow-xl">
        <p className="text-xs font-black tracking-widest text-muted uppercase">Error 404</p>
        <h1 className="mt-1 text-3xl font-black">Wrong note!</h1>
        <p className="mt-2 text-body">This page doesn’t exist. Maybe the link is old, or there’s a typo in the address.</p>
        <PianoKeyboard
          low={60}
          high={72}
          highlights={[{ midi: 64, label: '✕', color: STATUS.danger }]}
          className="mx-auto mt-4 block h-24"
        />
        <Link to="/" className="mt-5 inline-block rounded-2xl bg-brand px-5 py-2.5 font-black shadow active:scale-95">
          Back to the homepage
        </Link>
      </div>
    </div>
  )
}

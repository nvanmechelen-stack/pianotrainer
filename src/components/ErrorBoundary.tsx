import { Component, type ReactNode } from 'react'
import { reportError } from '../monitoring'

interface State {
  failed: boolean
}

/** Shows a friendly message instead of a blank page when a page crashes, and reports the error. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center p-4">
        <div className="rounded-3xl border border-line bg-panel p-6 text-center shadow-xl">
          <p className="text-4xl">🎹💥</p>
          <h1 className="mt-2 text-2xl font-black">Something went wrong</h1>
          <p className="mt-1 text-body">This page hit an error. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-2xl bg-brand px-5 py-2.5 font-black shadow active:scale-95"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}

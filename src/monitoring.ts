// Error monitoring with Sentry: only on the live site and only when a DSN is configured at build
// time (VITE_SENTRY_DSN, set as a GitHub Actions variable). The SDK is loaded after the app has
// started; errors that happen before that are queued and sent once it is ready.
// Sentry sets no cookies; it only receives error reports (message, stack, browser, page).

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const LIVE_HOSTS = ['pianotrainer-8e3da.web.app', 'pianotrainer-8e3da.firebaseapp.com']

type Sentry = typeof import('./sentryClient')
let sentry: Sentry | null = null
const pending: unknown[] = []

export const monitoringEnabled = () => Boolean(DSN) && LIVE_HOSTS.includes(window.location.hostname)

/** Report an error (e.g. from the React error boundary). Queued until Sentry has loaded. */
export function reportError(error: unknown): void {
  if (!monitoringEnabled()) return
  if (sentry) sentry.captureException(error)
  else pending.push(error)
}

export function startMonitoring(): void {
  if (!monitoringEnabled()) return
  // Catch early errors until Sentry installs its own handlers.
  const early = (e: ErrorEvent | PromiseRejectionEvent) => pending.push('reason' in e ? e.reason : e.error)
  window.addEventListener('error', early)
  window.addEventListener('unhandledrejection', early)
  const load = async () => {
    try {
      const s = await import('./sentryClient')
      // Errors only: no performance tracing, no session replay.
      s.init({ dsn: DSN, environment: 'production' })
      window.removeEventListener('error', early)
      window.removeEventListener('unhandledrejection', early)
      sentry = s
      for (const e of pending.splice(0)) s.captureException(e)
    } catch {
      // Blocked or offline: nothing to report to.
    }
  }
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
  idle(() => void load())
}

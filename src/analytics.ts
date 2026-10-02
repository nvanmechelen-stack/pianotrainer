// Google Analytics (via Firebase), only to count visits and page views.
// Loaded lazily, only after the visitor accepts, and only on the live site, so practising never
// waits for it and previews or local testing don't count. Page views on tab changes are tracked by
// GA4's enhanced measurement (browser history changes), so no per-page code is needed.
import { load, local, save } from './storage'

// Public web config: these values end up in every visitor's browser anyway.
const firebaseConfig = {
  apiKey: 'AIzaSyDbyHoZ7aFE7KlmrO2qu892LKuTRbREekY',
  authDomain: 'pianotrainer-8e3da.firebaseapp.com',
  projectId: 'pianotrainer-8e3da',
  storageBucket: 'pianotrainer-8e3da.firebasestorage.app',
  messagingSenderId: '895221336770',
  appId: '1:895221336770:web:32862514310c573351895b',
  measurementId: 'G-4WS2T13MRJ',
}

const LIVE_HOSTS = ['pianotrainer-8e3da.web.app', 'pianotrainer-8e3da.firebaseapp.com']

export type Consent = 'granted' | 'denied'
const CONSENT_KEY = 'pianotrainer.analytics.consent'

export const getConsent = () => load<Consent>(local, CONSENT_KEY)

let started = false

/** Start Google Analytics if the visitor agreed and this is the live site. Safe to call twice. */
export async function startAnalytics(): Promise<void> {
  if (started || getConsent() !== 'granted' || !LIVE_HOSTS.includes(window.location.hostname)) return
  started = true
  try {
    const [{ initializeApp }, { getAnalytics, isSupported }] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
    ])
    if (await isSupported()) getAnalytics(initializeApp(firebaseConfig))
  } catch {
    // Blocked by an ad blocker or offline: the app works the same without it.
  }
}

export function setConsent(consent: Consent): void {
  save(local, CONSENT_KEY, consent)
  if (consent === 'granted') void startAnalytics()
}

/** Forget the choice so the banner asks again (analytics already running stops on the next visit). */
export function resetConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY)
  } catch {
    // Storage unavailable: nothing was remembered anyway.
  }
}

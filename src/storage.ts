// Browser storage that never throws: private mode or blocked storage just means nothing is remembered.

export function load<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function save(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode): the app still works, it just forgets.
  }
}

export const local = () => window.localStorage
export const session = () => window.sessionStorage

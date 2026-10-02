import type { ReactNode } from 'react'

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-xl px-2.5 py-1.5 text-sm font-black transition-colors short:py-1 short:text-xs ${
        on ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow' : 'bg-ink/60 text-muted hover:bg-panel-2 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function Switch({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex flex-1 items-center gap-2.5 rounded-2xl bg-ink/60 px-3 py-2 text-left short:py-1.5"
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-accent-2' : 'bg-line'}`}>
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`}
        />
      </span>
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs font-bold text-muted">{hint}</span>
      </span>
    </button>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-1.5 hidden rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px] font-black [@media(hover:hover)]:inline">
      {children}
    </kbd>
  )
}

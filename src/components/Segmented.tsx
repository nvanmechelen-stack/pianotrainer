interface Props<T extends string | number> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}

export function Segmented<T extends string | number>({ options, value, onChange, className = '' }: Props<T>) {
  return (
    <div className={`flex gap-1 rounded-2xl bg-ink/60 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-2.5 py-1.5 text-sm font-extrabold whitespace-nowrap transition-colors short:px-2 short:py-1 short:text-xs ${
            o.value === value
              ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow'
              : 'text-muted hover:bg-panel-2 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

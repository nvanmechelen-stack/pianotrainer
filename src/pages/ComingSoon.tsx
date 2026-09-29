interface Props {
  title: string
  intro: string
  points: string[]
}

export function ComingSoon({ title, intro, points }: Props) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center p-4">
      <div className="rounded-3xl border border-line bg-panel p-6 shadow-xl">
        <span className="rounded-full bg-accent-2/20 px-3 py-1 text-xs font-extrabold tracking-wide text-accent-2 uppercase">
          Coming soon
        </span>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-1 text-muted">{intro}</p>
        <ul className="mt-4 space-y-2">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

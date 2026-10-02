import { useState } from 'react'
import { isBlack, whiteIndex } from '../theory/keyboard'

export interface KeyHighlight {
  midi: number
  /** Empty string: colour only, no label. */
  label: string
  color: string
  /** Draw only a coloured outline (e.g. a key that is still missing). */
  outline?: boolean
  /** Small text above the label, e.g. how a voice moved: "=", "↓½". */
  badge?: string
}

interface Props {
  /** Lowest and highest key; both must be white keys. */
  low: number
  high: number
  highlights?: KeyHighlight[]
  onKeyPress?: (midi: number) => void
  className?: string
}

const WHITE_W = 100
const WHITE_H = 400
const BLACK_W = 60
const BLACK_H = 250

/**
 * Reusable SVG piano keyboard. Scales to its container width; highlighted keys are
 * filled with their colour and carry a label (degree or note name).
 */
export function PianoKeyboard({ low, high, highlights = [], onKeyPress, className }: Props) {
  const [pressed, setPressed] = useState<number | null>(null)
  const byMidi = new Map(highlights.map((h) => [h.midi, h]))
  const first = whiteIndex(low)
  const whiteCount = whiteIndex(high) - first + 1

  const whites: number[] = []
  const blacks: number[] = []
  for (let m = low; m <= high; m++) (isBlack(m) ? blacks : whites).push(m)

  const press = (midi: number) => {
    setPressed(midi)
    onKeyPress?.(midi)
  }

  const renderBadge = (h: KeyHighlight, cx: number, cy: number, black: boolean) =>
    h.badge ? (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fontSize={black ? 24 : 28}
        fontWeight={900}
        // Highlighted keys are all light colours, so dark text reads on white and black keys alike.
        fill="#12112a"
        fontFamily="Nunito, system-ui, sans-serif"
        pointerEvents="none"
      >
        {h.badge}
      </text>
    ) : null

  const renderLabel = (h: KeyHighlight, cx: number, cy: number, black: boolean) => {
    if (!h.label) return null
    const r = black ? 25 : 33
    const size = (black ? 24 : 30) * (h.label.length > 2 ? 0.8 : 1)
    return (
      <g pointerEvents="none">
        <circle cx={cx} cy={cy} r={r} fill="#12112a" fillOpacity={0.88} />
        <text
          x={cx}
          y={cy}
          dy="0.35em"
          textAnchor="middle"
          fontSize={size}
          fontWeight={800}
          fill={h.color}
          fontFamily="Nunito, system-ui, sans-serif"
        >
          {h.label}
        </text>
      </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${whiteCount * WHITE_W} ${WHITE_H}`}
      className={className}
      role="img"
      aria-label="Piano keyboard"
      onPointerUp={() => setPressed(null)}
      onPointerLeave={() => setPressed(null)}
      style={{ touchAction: 'manipulation', userSelect: 'none' }}
    >
      {whites.map((m) => {
        const x = (whiteIndex(m) - first) * WHITE_W
        const h = byMidi.get(m)
        return (
          <g key={m} onPointerDown={() => press(m)} className="cursor-pointer">
            <rect
              x={x + 2}
              y={0}
              width={WHITE_W - 4}
              height={WHITE_H - 2}
              rx={10}
              fill={h && !h.outline ? h.color : '#f4f3fb'}
              stroke={h?.outline ? h.color : undefined}
              strokeWidth={h?.outline ? 10 : undefined}
              strokeDasharray={h?.outline ? '18 10' : undefined}
              opacity={pressed === m ? 0.75 : 1}
            />
            {!h && m % 12 === 0 && (
              <text
                x={x + WHITE_W / 2}
                y={WHITE_H - 26}
                textAnchor="middle"
                fontSize={22}
                fontWeight={700}
                fill="#676489"
                fontFamily="Nunito, system-ui, sans-serif"
                pointerEvents="none"
              >
                C{Math.floor(m / 12) - 1}
              </text>
            )}
            {h && renderBadge(h, x + WHITE_W / 2, WHITE_H - 112, false)}
            {h && renderLabel(h, x + WHITE_W / 2, WHITE_H - 60, false)}
          </g>
        )
      })}
      {blacks.map((m) => {
        const x = (whiteIndex(m) - first + 1) * WHITE_W - BLACK_W / 2
        const h = byMidi.get(m)
        return (
          <g key={m} onPointerDown={() => press(m)} className="cursor-pointer">
            <rect
              x={x}
              y={0}
              width={BLACK_W}
              height={BLACK_H}
              rx={8}
              fill={h && !h.outline ? h.color : '#1d1b3a'}
              stroke={h?.outline ? h.color : '#12112a'}
              strokeWidth={h?.outline ? 8 : 4}
              strokeDasharray={h?.outline ? '14 8' : undefined}
              opacity={pressed === m ? 0.75 : 1}
            />
            {h && renderBadge(h, x + BLACK_W / 2, BLACK_H - 84, true)}
            {h && renderLabel(h, x + BLACK_W / 2, BLACK_H - 42, true)}
          </g>
        )
      })}
    </svg>
  )
}

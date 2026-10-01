// A small Web Audio "electric-piano-ish" synth: no samples to download, starts instantly.

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): { ctx: AudioContext; master: GainNode } {
  if (!ctx || !master) {
    ctx = new AudioContext()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(compressor).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, master }
}

const PARTIALS: [number, number][] = [
  [1, 1],
  [2, 0.45],
  [3, 0.18],
  [4, 0.1],
  [6, 0.04],
]

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

export function playNote(midi: number, delay = 0, velocity = 0.8): void {
  const { ctx, master } = audio()
  const t = ctx.currentTime + delay
  const f = freq(midi)
  // Low notes ring longer, like a real string.
  const decay = Math.max(1.2, 3.5 - (midi - 36) * 0.04)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(Math.min(f * 8, 12000), t)
  filter.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 400), t + decay)

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(velocity * 0.25, t + 0.006)
  env.gain.exponentialRampToValueAtTime(velocity * 0.08, t + 0.4)
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  filter.connect(env).connect(master)

  for (const [mult, gain] of PARTIALS) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = f * mult
    osc.detune.value = (Math.random() - 0.5) * 4
    g.gain.value = gain
    osc.connect(g).connect(filter)
    osc.start(t)
    osc.stop(t + decay + 0.05)
  }
}

export function playChord(midis: number[], arpeggio = false): void {
  const sorted = [...midis].sort((a, b) => a - b)
  sorted.forEach((m, i) => playNote(m, arpeggio ? i * 0.14 : i * 0.008, 0.7))
}

/** Metronome tick; `accent` for the first beat of a bar. */
export function playClick(accent = false, delay = 0): void {
  const { ctx, master } = audio()
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.frequency.value = accent ? 1760 : 1320
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.002)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  osc.connect(env).connect(master)
  osc.start(t)
  osc.stop(t + 0.06)
}

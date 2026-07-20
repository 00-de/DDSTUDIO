import type { Clip, KeyframeValues } from '@/types'

const PROPS: (keyof KeyframeValues)[] = ['x', 'y', 'scale', 'rotate', 'rotateX', 'rotateY', 'opacity', 'cropX', 'cropY', 'cropW', 'cropH']

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// クリップの基準値（キーフレームが無いプロパティのフォールバック）
function baseValue(clip: Clip, p: keyof KeyframeValues): number {
  switch (p) {
    case 'x': return clip.x ?? 0
    case 'y': return clip.y ?? 0
    case 'scale': return clip.scale ?? 1
    case 'rotate': return clip.rotate ?? 0
    case 'rotateX': return clip.rotateX ?? 0
    case 'rotateY': return clip.rotateY ?? 0
    case 'opacity': return clip.opacity ?? 100
    case 'cropX': return clip.cropX ?? 0
    case 'cropY': return clip.cropY ?? 0
    case 'cropW': return clip.cropW ?? 100
    case 'cropH': return clip.cropH ?? 100
    default: return 0
  }
}

/** 再生ヘッド時刻 t（絶対秒）における、キーフレーム補間済みのクリップを返す */
export function resolveClip(clip: Clip, t: number): Clip {
  const kfs = clip.keyframes
  if (!kfs || kfs.length === 0) return clip

  const local = t - clip.start
  const sorted = [...kfs].sort((a, b) => a.time - b.time)
  const out: Clip = { ...clip }

  for (const p of PROPS) {
    // このプロパティにキーフレームを持つものだけ抽出
    const pk = sorted.filter((k) => k.values[p] !== undefined)
    if (pk.length === 0) continue
    if (local <= pk[0].time) { (out as unknown as Record<string, unknown>)[p] = pk[0].values[p]; continue }
    if (local >= pk[pk.length - 1].time) { (out as unknown as Record<string, unknown>)[p] = pk[pk.length - 1].values[p]; continue }

    for (let i = 0; i < pk.length - 1; i++) {
      const a = pk[i], b = pk[i + 1]
      if (local >= a.time && local <= b.time) {
        const span = b.time - a.time || 1
        let f = (local - a.time) / span
        if ((b.ease ?? 'easeInOut') === 'easeInOut') f = easeInOut(f)
        const va = a.values[p] as number, vb = b.values[p] as number
        ;(out as unknown as Record<string, unknown>)[p] = va + (vb - va) * f
        break
      }
    }
  }
  return out
}

/** 現在の見た目の値を1つのキーフレーム値として取り出す */
export function snapshotValues(clip: Clip): KeyframeValues {
  return {
    x: clip.x ?? 0,
    y: clip.y ?? 0,
    scale: clip.scale ?? 1,
    rotate: clip.rotate ?? 0,
    rotateX: clip.rotateX ?? 0,
    rotateY: clip.rotateY ?? 0,
    opacity: clip.opacity ?? 100,
    cropX: clip.cropX ?? 0,
    cropY: clip.cropY ?? 0,
    cropW: clip.cropW ?? 100,
    cropH: clip.cropH ?? 100,
  }
}

export { baseValue }

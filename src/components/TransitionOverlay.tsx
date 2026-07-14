import type { Clip } from '@/types'

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

// 0→1→0 の山（both用）
const bell = (p: number) => 1 - Math.abs(2 * p - 1)

function overlayStyle(c: Clip, t: number): React.CSSProperties | null {
  const p = clamp((t - c.start) / Math.max(0.001, c.duration), 0, 1)
  const dir = c.direction ?? 'both'
  const color = c.transColor ?? '#000000'
  const base: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' }

  switch (c.transition) {
    case 'フェード':
    case 'クロスフェード':
    case 'ブラックアウト': {
      const op = dir === 'in' ? 1 - p : dir === 'out' ? p : bell(p)
      return { ...base, background: color, opacity: op }
    }
    case 'ホワイトアウト': {
      const op = dir === 'in' ? 1 - p : dir === 'out' ? p : bell(p)
      return { ...base, background: '#ffffff', opacity: op }
    }
    case 'フラッシュ': {
      return { ...base, background: '#ffffff', opacity: Math.pow(bell(p), 0.6) }
    }
    case 'ワイプ': {
      const cover = dir === 'in' ? 1 - p : p // 0→1
      const d = dir === 'left' || dir === 'in' || dir === 'out' ? 'left' : dir
      const pct = `${cover * 100}%`
      if (d === 'right') return { ...base, background: color, left: 'auto', right: 0, width: pct }
      if (d === 'up') return { ...base, background: color, bottom: 'auto', top: 0, height: pct, width: '100%' }
      if (d === 'down') return { ...base, background: color, top: 'auto', bottom: 0, height: pct, width: '100%' }
      return { ...base, background: color, right: 'auto', left: 0, width: pct }
    }
    case 'スライド': {
      const off = -100 + 200 * p // -100%→100%
      const axis = dir === 'up' || dir === 'down' ? 'Y' : 'X'
      const sign = dir === 'right' || dir === 'down' ? 1 : -1
      return { ...base, background: color, transform: `translate${axis}(${off * sign}%)` }
    }
    case 'ズーム': {
      // アイリス（中心から黒が開閉）
      const r = dir === 'in' ? p * 90 : dir === 'out' ? (1 - p) * 90 : (1 - bell(p)) * 90
      return { ...base, background: `radial-gradient(circle at 50% 50%, transparent ${r}%, ${color} ${r + 8}%)` }
    }
    case '回転': {
      // 時計ワイプ
      const deg = p * 360
      return { ...base, background: `conic-gradient(from 0deg at 50% 50%, ${color} ${deg}deg, transparent ${deg}deg 360deg)` }
    }
    default:
      return null
  }
}

export default function TransitionOverlay({ clips, t }: { clips: Clip[]; t: number }) {
  if (clips.length === 0) return null
  return (
    <>
      {clips.map((c) => {
        const st = overlayStyle(c, t)
        if (!st) return null
        return <div key={c.id} style={st} />
      })}
    </>
  )
}

// カメラ演出 → プレビュー内容に適用する transform
export function cameraStyle(c: Clip | undefined, t: number): React.CSSProperties {
  if (!c) return {}
  const p = clamp((t - c.start) / Math.max(0.001, c.duration), 0, 1)
  switch (c.camera) {
    case 'ズーム': return { transform: `scale(${1 + 0.35 * p})` }
    case 'パン': return { transform: `scale(1.15) translateX(${-10 * p}%)` }
    case '左右移動': return { transform: `scale(1.15) translateX(${-12 + 24 * p}%)` }
    case '上下移動': return { transform: `scale(1.15) translateY(${-12 + 24 * p}%)` }
    case '回転': return { transform: `scale(1.2) rotate(${-4 + 8 * p}deg)` }
    case '手ぶれ風': return { transform: `scale(1.06) translate(${Math.sin(t * 40) * 0.7}%, ${Math.cos(t * 33) * 0.7}%)` }
    case '映画風': return { transform: `scale(${1.05 + 0.1 * p})` }
    case 'ライブ風': return { transform: `scale(${1.1 + 0.06 * Math.abs(Math.sin(t * 6))}) rotate(${Math.sin(t * 3) * 1.2}deg)` }
    default: return {}
  }
}

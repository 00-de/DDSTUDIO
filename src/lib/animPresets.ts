// 登場・退場アニメのプリセット：クリップにキーフレームを自動生成する
import type { Clip, Keyframe, KeyframeValues } from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10)

export interface AnimPreset { id: string; name: string; group: '登場' | '退場' }

export const ANIM_PRESETS: AnimPreset[] = [
  { id: 'in-depth', name: '奥から飛び出す', group: '登場' },
  { id: 'in-front', name: '手前から着地', group: '登場' },
  { id: 'in-left', name: '左からスライド', group: '登場' },
  { id: 'in-right', name: '右からスライド', group: '登場' },
  { id: 'in-top', name: '上から落ちる', group: '登場' },
  { id: 'in-bottom', name: '下からポップ', group: '登場' },
  { id: 'in-zoom', name: 'ズームイン', group: '登場' },
  { id: 'in-spin', name: '回転イン', group: '登場' },
  { id: 'in-fade', name: 'フェードイン', group: '登場' },
  { id: 'out-depth', name: '奥へ吸い込まれる', group: '退場' },
  { id: 'out-front', name: '手前へ飛び去る', group: '退場' },
  { id: 'out-left', name: '左へスライド', group: '退場' },
  { id: 'out-right', name: '右へスライド', group: '退場' },
  { id: 'out-zoom', name: 'ズームアウト', group: '退場' },
  { id: 'out-spin', name: '回転アウト', group: '退場' },
  { id: 'out-fade', name: 'フェードアウト', group: '退場' },
]

// 現在値（キーフレームの「通常状態」に使う）
function normal(clip: Clip): KeyframeValues {
  return {
    x: clip.x ?? 0, y: clip.y ?? 0, scale: clip.scale ?? 1,
    rotate: clip.rotate ?? 0, z: clip.z ?? 0, opacity: clip.opacity ?? 100,
  }
}

// プリセットの「変化した状態」（登場の開始 / 退場の終了）
function altered(id: string, n: KeyframeValues): KeyframeValues {
  const v = { ...n }
  switch (id.replace(/^in-|^out-/, '')) {
    case 'depth': v.z = -900; v.opacity = 0; break
    case 'front': v.z = 600; v.opacity = 0; break
    case 'left': v.x = (n.x ?? 0) - 90; v.opacity = 0; break
    case 'right': v.x = (n.x ?? 0) + 90; v.opacity = 0; break
    case 'top': v.y = (n.y ?? 0) - 90; v.opacity = 0; break
    case 'bottom': v.y = (n.y ?? 0) + 90; v.opacity = 0; break
    case 'zoom': v.scale = 0.05; v.opacity = 0; break
    case 'spin': v.rotate = (n.rotate ?? 0) - 360; v.scale = 0.15; v.opacity = 0; break
    case 'fade': v.opacity = 0; break
  }
  return v
}

/** クリップにプリセットを適用したキーフレーム配列を返す（既存KFと合成） */
export function applyAnimPreset(clip: Clip, presetId: string, animDur: number): Keyframe[] {
  const n = normal(clip)
  const a = altered(presetId, n)
  const isIn = presetId.startsWith('in-')
  const D = Math.min(animDur, Math.max(0.2, clip.duration * 0.45))

  const t0 = isIn ? 0 : Math.max(0, clip.duration - D)
  const t1 = isIn ? D : clip.duration
  const startVals = isIn ? a : n
  const endVals = isIn ? n : a

  const eps = 0.03
  // 同時刻付近の既存KFを除いて追加
  const kept = (clip.keyframes ?? []).filter((k) => Math.abs(k.time - t0) > eps && Math.abs(k.time - t1) > eps)
  const added: Keyframe[] = [
    { id: uid(), time: t0, values: startVals, ease: 'easeInOut' },
    { id: uid(), time: t1, values: endVals, ease: 'easeInOut' },
  ]
  return [...kept, ...added].sort((x, y) => x.time - y.time)
}

import type { Clip } from '@/types'

export type Fx = NonNullable<Clip['fx']>

// CSS filter 文字列（プレビュー・Canvas 共通で使える範囲）
export function cssFilter(fx?: Fx): string {
  if (!fx) return ''
  const parts: string[] = []
  if (fx.brightness != null && fx.brightness !== 100) parts.push(`brightness(${fx.brightness}%)`)
  if (fx.contrast != null && fx.contrast !== 100) parts.push(`contrast(${fx.contrast}%)`)
  if (fx.saturate != null && fx.saturate !== 100) parts.push(`saturate(${fx.saturate}%)`)
  if (fx.hue) parts.push(`hue-rotate(${fx.hue}deg)`)
  if (fx.sepia) parts.push(`sepia(${fx.sepia}%)`)
  if (fx.grayscale) parts.push(`grayscale(${fx.grayscale}%)`)
  if (fx.invert) parts.push(`invert(${fx.invert}%)`)
  if (fx.blur) parts.push(`blur(${fx.blur}px)`)
  return parts.join(' ')
}

// グロー（発光）用の drop-shadow（CSS）
export function glowShadow(fx?: Fx): string {
  if (!fx?.glow) return ''
  const c = fx.glowColor ?? '#ffffff'
  const s = fx.glow / 100
  return `drop-shadow(0 0 ${8 * s}px ${c}) drop-shadow(0 0 ${20 * s}px ${c})`
}

export function hasFx(fx?: Fx): boolean {
  if (!fx) return false
  return !!(
    (fx.brightness != null && fx.brightness !== 100) ||
    (fx.contrast != null && fx.contrast !== 100) ||
    (fx.saturate != null && fx.saturate !== 100) ||
    fx.hue || fx.sepia || fx.grayscale || fx.invert || fx.blur ||
    fx.glow || fx.vignette || (fx.tint && fx.tintAmount)
  )
}

// ===== プリセット（色補正・光）=====
export interface FxPreset { id: string; name: string; group: string; fx: Fx }

const P = (id: string, name: string, group: string, fx: Fx): FxPreset => ({ id, name, group, fx })

export const FX_PRESETS: FxPreset[] = [
  // 基本
  P('none', 'なし', '基本', {}),
  P('bright', '明るく', '基本', { brightness: 125 }),
  P('dark', '暗く', '基本', { brightness: 75 }),
  P('pop', 'くっきり', '基本', { contrast: 125, saturate: 130 }),
  P('soft', 'やわらか', '基本', { contrast: 92, brightness: 106, saturate: 95 }),
  P('vivid', 'ビビッド', '基本', { saturate: 175, contrast: 112 }),
  P('fade', 'フェード', '基本', { contrast: 85, saturate: 80, brightness: 108 }),
  P('mono', 'モノクロ', '基本', { grayscale: 100 }),
  P('mono-contrast', 'モノクロ強', '基本', { grayscale: 100, contrast: 135 }),
  P('sepia', 'セピア', '基本', { sepia: 80, contrast: 105 }),
  P('invert', 'ネガ', '基本', { invert: 100 }),

  // 色味（フィルム/ムード）
  P('warm', '暖色', '色味', { tint: '#ff8a3d', tintAmount: 22, saturate: 110 }),
  P('cool', '寒色', '色味', { tint: '#3da5ff', tintAmount: 22, saturate: 105 }),
  P('sunset', '夕焼け', '色味', { tint: '#ff5e3a', tintAmount: 28, brightness: 105, saturate: 120 }),
  P('night', 'ナイト', '色味', { tint: '#2a3aff', tintAmount: 25, brightness: 82, contrast: 115 }),
  P('teal-orange', 'ティール&オレンジ', '色味', { saturate: 120, contrast: 110, tint: '#00b3b3', tintAmount: 12 }),
  P('pink-dream', 'ピンクドリーム', '色味', { tint: '#ff5ea8', tintAmount: 24, brightness: 108, saturate: 115 }),
  P('cyber', 'サイバー', '色味', { hue: 250, saturate: 160, contrast: 120 }),
  P('matrix', 'マトリックス', '色味', { tint: '#00ff66', tintAmount: 30, grayscale: 30, contrast: 120 }),
  P('vintage', 'ヴィンテージ', '色味', { sepia: 40, saturate: 85, contrast: 92, tint: '#ffc27a', tintAmount: 15 }),
  P('lomo', 'ロモ', '色味', { saturate: 140, contrast: 130, vignette: 55 }),

  // 光・グロー
  P('glow-w', 'グロー(白)', '光', { glow: 60, glowColor: '#ffffff', brightness: 108 }),
  P('glow-pink', 'グロー(桃)', '光', { glow: 65, glowColor: '#ff6ec7', saturate: 120 }),
  P('glow-cyan', 'グロー(水)', '光', { glow: 65, glowColor: '#22d3ee', saturate: 120 }),
  P('glow-gold', 'グロー(金)', '光', { glow: 60, glowColor: '#ffd54a', brightness: 106 }),
  P('dream', '夢見心地', '光', { glow: 45, glowColor: '#ffffff', contrast: 90, saturate: 115, brightness: 108 }),
  P('spotlight', 'スポットライト', '光', { vignette: 60, brightness: 112, contrast: 110 }),
  P('bloom', 'ブルーム', '光', { glow: 40, glowColor: '#fff4c2', brightness: 110, saturate: 110 }),

  // ぼかし・ソフト
  P('blur-soft', 'ソフトフォーカス', 'ぼかし', { blur: 3, brightness: 106, saturate: 108 }),
  P('blur-strong', '強ぼかし', 'ぼかし', { blur: 10 }),
  P('haze', 'ヘイズ', 'ぼかし', { blur: 2, contrast: 85, brightness: 110, saturate: 90 }),
]

export function presetsByGroup(): Record<string, FxPreset[]> {
  const g: Record<string, FxPreset[]> = {}
  for (const p of FX_PRESETS) (g[p.group] ||= []).push(p)
  return g
}

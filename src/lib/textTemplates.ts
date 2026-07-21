// テキストテンプレート生成エンジン（ベース × パレットの掛け合わせ）
import type { Clip } from '@/types'
export type TStyle = NonNullable<Clip['tstyle']>

export interface Palette { id: string; name: string; a: string; b: string; stroke: string; group: string }

// パレット15種（第1回）：定番10 + メンバー5（キャラクターテキスト）
export const PALETTES: Palette[] = [
  { id: 'white', name: 'ホワイト', a: '#ffffff', b: '#e2e8f0', stroke: '#1e293b', group: '定番' },
  { id: 'black', name: 'ブラック', a: '#111827', b: '#374151', stroke: '#ffffff', group: '定番' },
  { id: 'red', name: 'レッド', a: '#ef4444', b: '#b91c1c', stroke: '#ffffff', group: '定番' },
  { id: 'blue', name: 'ブルー', a: '#3b82f6', b: '#1d4ed8', stroke: '#ffffff', group: '定番' },
  { id: 'gold', name: 'ゴールド', a: '#fde047', b: '#f59e0b', stroke: '#78350f', group: '定番' },
  { id: 'silver', name: 'シルバー', a: '#f8fafc', b: '#94a3b8', stroke: '#334155', group: '定番' },
  { id: 'pink', name: 'ピンク', a: '#f472b6', b: '#db2777', stroke: '#ffffff', group: '定番' },
  { id: 'purple', name: 'パープル', a: '#a855f7', b: '#6d28d9', stroke: '#ffffff', group: '定番' },
  { id: 'cyan', name: 'シアン', a: '#22d3ee', b: '#0891b2', stroke: '#ffffff', group: '定番' },
  { id: 'rainbow', name: 'レインボー', a: '#22d3ee', b: '#ec4899', stroke: '#ffffff', group: '定番' },
  // DayDreamプラス メンバーカラー
  { id: 'yuma', name: '悠真', a: '#3B82F6', b: '#1e40af', stroke: '#ffffff', group: 'メンバー' },
  { id: 'aoi', name: '葵', a: '#F59E0B', b: '#b45309', stroke: '#ffffff', group: 'メンバー' },
  { id: 'ren', name: '蓮', a: '#8B5CF6', b: '#5b21b6', stroke: '#ffffff', group: 'メンバー' },
  { id: 'yui', name: '結衣', a: '#EC4899', b: '#9d174d', stroke: '#ffffff', group: 'メンバー' },
  { id: 'daichi', name: '大地', a: '#22C55E', b: '#15803d', stroke: '#ffffff', group: 'メンバー' },
]

export interface BaseDef { id: string; name: string; make: (p: Palette) => TStyle }
const B = (id: string, name: string, make: (p: Palette) => TStyle): BaseDef => ({ id, name, make })

// ベースデザイン20種（第1回）
export const BASES: BaseDef[] = [
  B('plain', 'シンプル', (p) => ({ weight: 700, fill: p.a })),
  B('outline', '縁取り', (p) => ({ weight: 900, fill: p.a, strokeW: 5, strokeC: p.stroke })),
  B('bold-outline', '極太縁取り', (p) => ({ weight: 900, fill: p.a, strokeW: 10, strokeC: p.stroke })),
  B('double', '袋文字', (p) => ({ weight: 900, fill: '#ffffff', strokeW: 8, strokeC: p.a, shadow: 8, shadowC: p.b })),
  B('grad', 'グラデ', (p) => ({ weight: 900, fill: p.a, fill2: p.b, strokeW: 4, strokeC: '#ffffff' })),
  B('grad-dark', 'グラデ縁黒', (p) => ({ weight: 900, fill: p.a, fill2: p.b, strokeW: 5, strokeC: '#111827' })),
  B('neon', 'ネオン', (p) => ({ weight: 700, fill: '#ffffff', glow: 24, glowC: p.a, strokeW: 2, strokeC: p.a })),
  B('neon-strong', 'ネオン強', (p) => ({ weight: 900, fill: p.a, glow: 34, glowC: p.a })),
  B('shadow', 'ドロップ影', (p) => ({ weight: 900, fill: p.a, shadow: 14, shadowC: '#000000' })),
  B('long-shadow', 'ロング影', (p) => ({ weight: 900, fill: p.a, shadow: 26, shadowC: p.b })),
  B('band', '背景帯', (p) => ({ weight: 700, fill: '#ffffff', bg: p.a, bgRadius: 6 })),
  B('band-round', '丸帯', (p) => ({ weight: 900, fill: '#ffffff', bg: p.a, bgRadius: 999 })),
  B('band-dark', '黒帯', (p) => ({ weight: 700, fill: p.a, bg: 'rgba(0,0,0,0.75)', bgRadius: 4 })),
  B('retro', 'レトロ', (p) => ({ weight: 900, italic: true, fill: p.a, strokeW: 6, strokeC: '#fff7ed', shadow: 10, shadowC: p.b })),
  B('elegant', 'エレガント', (p) => ({ weight: 400, italic: true, fill: p.a, spacing: 6, shadow: 6, shadowC: '#00000088' })),
  B('wide', 'ワイド字間', (p) => ({ weight: 700, fill: p.a, spacing: 12, strokeW: 2, strokeC: p.stroke })),
  B('pop', 'ポップ', (p) => ({ weight: 900, fill: p.a, strokeW: 7, strokeC: '#ffffff', shadow: 10, shadowC: p.b, spacing: 2 })),
  B('glow-soft', 'やわ発光', (p) => ({ weight: 700, fill: '#ffffff', glow: 12, glowC: p.a })),
  B('metal', 'メタル', (p) => ({ weight: 900, fill: '#f8fafc', fill2: p.b, strokeW: 3, strokeC: '#0f172a', shadow: 8, shadowC: '#000000' })),
  B('karaoke', 'カラオケ風', (p) => ({ weight: 900, fill: p.a, strokeW: 6, strokeC: '#ffffff', glow: 10, glowC: p.a })),
]

export interface TextTemplate { id: string; name: string; group: string; tstyle: TStyle }

export function allTemplates(): TextTemplate[] {
  const out: TextTemplate[] = []
  for (const b of BASES) for (const p of PALETTES) {
    out.push({ id: `${b.id}-${p.id}`, name: `${b.name}・${p.name}`, group: p.group === 'メンバー' ? 'メンバー' : b.name, tstyle: b.make(p) })
  }
  return out
}

// CSS へ変換（プレビュー用）
export function tstyleCss(ts?: TStyle): React.CSSProperties {
  if (!ts) return {}
  const st: React.CSSProperties = {}
  st.fontWeight = ts.weight ?? 700
  if (ts.italic) st.fontStyle = 'italic'
  if (ts.spacing) st.letterSpacing = `${ts.spacing}px`
  if (ts.fill2) {
    st.backgroundImage = `linear-gradient(180deg, ${ts.fill}, ${ts.fill2})`
    st.WebkitBackgroundClip = 'text'
    st.backgroundClip = 'text'
    st.color = 'transparent'
  } else if (ts.fill) st.color = ts.fill
  if (ts.strokeW) (st as Record<string, unknown>)['WebkitTextStroke'] = `${ts.strokeW / 2}px ${ts.strokeC ?? '#000'}`
  const shadows: string[] = []
  if (ts.shadow) shadows.push(`0 ${Math.max(2, ts.shadow / 3)}px ${ts.shadow}px ${ts.shadowC ?? '#000'}`)
  if (ts.glow) { const g = ts.glowC ?? '#fff'; shadows.push(`0 0 ${ts.glow}px ${g}`, `0 0 ${ts.glow * 2}px ${g}`) }
  if (shadows.length) st.textShadow = shadows.join(', ')
  if (ts.bg && ts.bg !== 'transparent') { st.background = ts.bg; st.padding = '0.15em 0.5em'; st.borderRadius = ts.bgRadius ?? 6 }
  return st
}

import type { Member, EffectDef, TrackType } from '@/types'

// DayDreamプラス メンバー（仕様書準拠）
export const MEMBERS: Member[] = [
  { id: 'yuma', name: '悠真', color: '#3B82F6', position: 'センター', profile: 'DayDreamプラスのリーダー。' },
  { id: 'aoi', name: '葵', color: '#22C55E', position: '左', profile: '爽やかな癒し系メンバー。' },
  { id: 'ren', name: '蓮', color: '#A855F7', position: '右', profile: 'クールなパフォーマー。' },
  { id: 'yui', name: '結衣', color: '#EC4899', position: '左前', profile: '元気いっぱいのムードメーカー。' },
  { id: 'daichi', name: '大地', color: '#F97316', position: '右前', profile: 'パワフルなダンス担当。' },
]

// エフェクト（仕様書準拠）
export const EFFECTS: EffectDef[] = [
  { id: 'confetti', name: '紙吹雪', icon: '🎊', color: '#EC4899' },
  { id: 'sakura', name: '桜', icon: '🌸', color: '#F9A8D4' },
  { id: 'petal', name: '花びら', icon: '🌺', color: '#FB7185' },
  { id: 'star', name: '星', icon: '⭐', color: '#FBBF24' },
  { id: 'heart', name: 'ハート', icon: '💖', color: '#F472B6' },
  { id: 'laser', name: 'レーザー', icon: '🔦', color: '#22D3EE' },
  { id: 'spotlight', name: 'スポットライト', icon: '💡', color: '#FDE68A' },
  { id: 'sparkle', name: 'キラキラ', icon: '✨', color: '#A78BFA' },
  { id: 'fire', name: '炎', icon: '🔥', color: '#F97316' },
  { id: 'smoke', name: '煙', icon: '💨', color: '#94A3B8' },
  { id: 'snow', name: '雪', icon: '❄️', color: '#BAE6FD' },
  { id: 'rain', name: '雨', icon: '🌧️', color: '#60A5FA' },
  { id: 'bubble', name: '泡', icon: '🫧', color: '#7DD3FC' },
  { id: 'lightray', name: '光線', icon: '🌟', color: '#FDE047' },
  { id: 'firework', name: '花火', icon: '🎆', color: '#C084FC' },
  { id: 'shooting', name: '流れ星', icon: '💫', color: '#38BDF8' },
]

// 背景プリセット
export const BACKGROUNDS = [
  '単色', '画像', '動画', 'ライブLED', '宇宙', '海', '夜景', '桜並木', 'ステージ', 'スクリーン', 'グラデーション',
]

// トランジション
export const TRANSITIONS = [
  'フェード', 'クロスフェード', 'スライド', 'ズーム', '回転', 'ブラックアウト', 'ホワイトアウト', 'ワイプ', 'フラッシュ',
]

// カメラ演出
export const CAMERA_MOVES = [
  'ズーム', 'パン', '左右移動', '上下移動', '回転', '手ぶれ風', '映画風', 'ライブ風',
]

// トラック定義（初期構成）
export const TRACK_DEFS: { type: TrackType; name: string }[] = [
  { type: 'video', name: '動画' },
  { type: 'image', name: '画像' },
  { type: 'background', name: '背景' },
  { type: 'effect', name: 'エフェクト' },
  { type: 'lyrics', name: '歌詞' },
  { type: 'subtitle', name: '字幕' },
  { type: 'camera', name: 'カメラ演出' },
  { type: 'light', name: '照明' },
  { type: 'audio', name: '音楽' },
]

export const TRACK_COLORS: Record<TrackType, string> = {
  video: '#3B82F6',
  image: '#06B6D4',
  audio: '#22C55E',
  subtitle: '#F59E0B',
  lyrics: '#EC4899',
  background: '#64748B',
  effect: '#A855F7',
  light: '#FBBF24',
  camera: '#F97316',
}

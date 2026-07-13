// ==== 素材 ====
export type MediaKind = 'video' | 'image' | 'audio'

export interface MediaAsset {
  id: string
  name: string
  path: string
  url: string
  ext: string
  kind: MediaKind
  duration?: number // 実尺（秒）。動画・音声は読み取り、画像は既定値
}

// ==== トラック種別（仕様書のタイムライン構成に対応）====
export type TrackType =
  | 'video'
  | 'image'
  | 'audio'
  | 'subtitle'
  | 'lyrics'
  | 'background'
  | 'effect'
  | 'light'
  | 'camera'

// ==== クリップ ====
export interface Clip {
  id: string
  trackId: string
  assetId?: string // 素材由来の場合
  label: string
  start: number // 秒
  duration: number // 秒
  color: string
  kind: TrackType
  // 追加プロパティ（プロパティパネルで編集）
  text?: string
  fontSize?: number
  fontColor?: string
  memberId?: string
  effectId?: string
  opacity?: number
  volume?: number
  // 編集プロパティ
  rotate?: number // 0/90/180/270
  speed?: number // 再生速度 0.25〜4
  mirror?: boolean // 左右反転
  reverse?: boolean // 逆再生
  fadeIn?: number // 秒
  fadeOut?: number // 秒
  muted?: boolean
  pan?: number // -100(左)〜100(右)
}

export interface Track {
  id: string
  type: TrackType
  name: string
  clips: Clip[]
  locked: boolean
  muted: boolean
  hidden: boolean
}

// ==== プロジェクト ====
export interface Project {
  version: string
  name: string
  createdAt: number
  updatedAt: number
  resolution: '720p' | '1080p' | '2k' | '4k'
  fps: number
  durationSec: number
  assets: MediaAsset[]
  tracks: Track[]
}

// ==== メンバー ====
export interface Member {
  id: string
  name: string
  color: string
  position: string // 立ち位置
  profile: string
}

// ==== エフェクト定義 ====
export interface EffectDef {
  id: string
  name: string
  icon: string // emoji
  color: string
}

// ==== 設定 ====
export interface Settings {
  autoSaveMinutes: number
  gpuAcceleration: boolean
  theme: 'dark' | 'stage'
  savePath: string
}

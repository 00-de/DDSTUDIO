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

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
  // プレビュー上の配置（中心からの%オフセットと拡大率）
  x?: number // -50〜50
  y?: number // -50〜50
  scale?: number // 拡大率 0.1〜4
  rotateX?: number // 3D 傾き（X軸）度
  rotateY?: number // 3D 傾き（Y軸）度
  z?: number // 奥行き -900(奥)〜600(手前) px相当
  layer?: number // 重なり順（大きいほど前面）
  // Pan/Crop（素材の一部を切り出して表示）0〜100 の%。crop で囲った領域が画面いっぱいに表示される
  cropX?: number // 左端 %（0〜100）
  cropY?: number // 上端 %（0〜100）
  cropW?: number // 幅 %（0〜100、既定100）
  cropH?: number // 高さ %（0〜100、既定100）
  // 枠飾り（PiP/コラージュ用）
  borderWidth?: number // px
  borderColor?: string
  borderRadius?: number // px
  frameShadow?: boolean
  // 色補正・光フィルター
  fx?: {
    brightness?: number  // 明るさ 0〜200（既定100）
    contrast?: number    // コントラスト 0〜200（既定100）
    saturate?: number    // 彩度 0〜300（既定100）
    hue?: number         // 色相回転 0〜360
    sepia?: number       // セピア 0〜100
    grayscale?: number   // 白黒 0〜100
    invert?: number      // 反転 0〜100
    blur?: number        // ぼかし px 0〜30
    glow?: number        // グロー(発光) 0〜100
    glowColor?: string   // グロー色
    vignette?: number    // 周辺減光 0〜100
    tint?: string        // 色被せ
    tintAmount?: number  // 色被せ量 0〜100
  }
  // コラージュ/PiP のセル（枠）。指定時はこのセル内に cover 表示される（frame比 0〜1）
  cellW?: number
  cellH?: number
  // トランジション / カメラ演出
  transition?: string // 'フェード' 等
  direction?: 'both' | 'in' | 'out' | 'left' | 'right' | 'up' | 'down'
  transColor?: string
  camera?: string // 'ズーム' 等
  keyframes?: Keyframe[] // アニメーション
}

// アニメ可能なプロパティ
export interface KeyframeValues {
  x?: number
  y?: number
  scale?: number
  rotate?: number
  rotateX?: number
  rotateY?: number
  z?: number
  opacity?: number
  cropX?: number
  cropY?: number
  cropW?: number
  cropH?: number
}
export interface Keyframe {
  id: string
  time: number // クリップ内の相対秒
  values: KeyframeValues
  ease?: 'linear' | 'easeInOut'
}

export interface Track {
  id: string
  type: TrackType
  name: string
  clips: Clip[]
  locked: boolean
  muted: boolean
  hidden: boolean
  solo?: boolean
  volume?: number // 0〜100
  height?: number // トラックの高さ(px)
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

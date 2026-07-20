import { create } from 'zustand'
import type { Project, Track, Clip, MediaAsset, Settings, TrackType, KeyframeValues } from '@/types'
import { TRACK_DEFS, TRACK_COLORS } from '@/lib/catalog'
import { resolveClip } from '@/lib/keyframes'

const uid = () => Math.random().toString(36).slice(2, 10)

function makeTracks(): Track[] {
  return TRACK_DEFS.map((d) => ({
    id: uid(),
    type: d.type,
    name: d.name,
    clips: [],
    locked: false,
    muted: false,
    hidden: false,
  }))
}

// タイムラインの総尺を中身に合わせて自動調整（最低30秒、末尾に5秒の余白）
function fit(p: Project): Project {
  let end = 0
  for (const t of p.tracks) for (const c of t.clips) end = Math.max(end, c.start + c.duration)
  p.durationSec = Math.max(30, Math.ceil(end + 5))
  return p
}

export function newProject(name = '無題のプロジェクト'): Project {
  return {
    version: '1.0.0',
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    resolution: '1080p',
    fps: 60,
    durationSec: 60,
    assets: [],
    tracks: makeTracks(),
  }
}

interface RecentItem {
  name: string
  path: string
  at: number
}

interface StoreState {
  // 画面
  screen: 'home' | 'editor'
  // プロジェクト
  project: Project
  filePath?: string
  dirty: boolean
  // 選択・再生
  selectedClipId?: string
  currentTime: number
  playing: boolean
  zoom: number // px per second
  // 履歴
  past: Project[]
  future: Project[]
  // 最近使用 / 設定
  recent: RecentItem[]
  settings: Settings
  // モーダル
  modal: null | 'settings' | 'export' | 'telop' | 'collab' | 'layout' | 'collage'
  // 共同編集
  collabOn: boolean
  collabRoom: string
  peers: { id: string; name: string; color: string; currentTime: number; selectedClipId?: string; at: number }[]

  // ---- 操作 ----
  goHome: () => void
  createProject: (name?: string) => void
  loadProject: (p: Project, filePath?: string) => void
  setName: (name: string) => void
  setResolution: (r: Project['resolution']) => void
  setFps: (f: number) => void

  addAssets: (assets: MediaAsset[]) => void
  addClipFromAsset: (assetId: string, trackType: TrackType) => void
  addSpecialClip: (partial: Partial<Clip> & { kind: TrackType; label: string }) => void
  updateClip: (id: string, patch: Partial<Clip>) => void
  addKeyframe: (clipId: string, atLocal: number) => void
  removeKeyframe: (clipId: string, kfId: string) => void
  setAnimatedValue: (clipId: string, patch: Partial<import('@/types').KeyframeValues>, atLocal: number) => void
  moveClip: (id: string, start: number) => void
  removeClip: (id: string) => void
  duplicateClip: (id: string) => void
  splitClip: (id: string, at: number) => void
  selectClip: (id?: string) => void
  updateTrack: (id: string, patch: Partial<Track>) => void
  addTrack: (type: TrackType) => void
  removeTrack: (id: string) => void
  moveTrack: (id: string, dir: 'up' | 'down') => void
  moveTrackTo: (id: string, toIndex: number) => void
  addClipFromAssetAt: (assetId: string, trackId: string, start: number) => void
  createCollage: (cells: { assetId: string; x: number; y: number; scale: number; layer: number; borderWidth?: number; borderColor?: string; borderRadius?: number; frameShadow?: boolean }[], start: number, duration: number) => void
  addTelop: (text?: string) => void
  addTelopLines: (text: string, perLine?: number) => void

  setCurrentTime: (t: number) => void
  togglePlay: () => void
  setPlaying: (p: boolean) => void
  setZoom: (z: number) => void

  undo: () => void
  redo: () => void

  markSaved: (filePath: string) => void
  pushRecent: (item: RecentItem) => void
  updateSettings: (patch: Partial<Settings>) => void
  openModal: (m: StoreState['modal']) => void
}

// 履歴に積んでから mutate するためのヘルパ
function withHistory(state: StoreState, mutate: (p: Project) => Project): Partial<StoreState> {
  const snapshot = JSON.parse(JSON.stringify(state.project)) as Project
  const next = mutate(JSON.parse(JSON.stringify(state.project)))
  next.updatedAt = Date.now()
  return {
    past: [...state.past.slice(-49), snapshot],
    future: [],
    project: next,
    dirty: true,
  }
}

export const useStore = create<StoreState>((set, get) => ({
  screen: 'home',
  project: newProject(),
  dirty: false,
  currentTime: 0,
  playing: false,
  zoom: 12,
  past: [],
  future: [],
  recent: [],
  settings: {
    autoSaveMinutes: 3,
    gpuAcceleration: true,
    theme: 'stage',
    savePath: '',
  },
  modal: null,
  collabOn: false,
  collabRoom: '',
  peers: [],

  goHome: () => set({ screen: 'home' }),

  createProject: (name) =>
    set({
      project: newProject(name),
      filePath: undefined,
      screen: 'editor',
      dirty: false,
      past: [],
      future: [],
      selectedClipId: undefined,
      currentTime: 0,
      playing: false,
    }),

  loadProject: (p, filePath) =>
    set({
      project: p,
      filePath,
      screen: 'editor',
      dirty: false,
      past: [],
      future: [],
      selectedClipId: undefined,
      currentTime: 0,
      playing: false,
    }),

  setName: (name) => set((s) => withHistory(s, (p) => ({ ...p, name }))),
  setResolution: (resolution) => set((s) => withHistory(s, (p) => ({ ...p, resolution }))),
  setFps: (fps) => set((s) => withHistory(s, (p) => ({ ...p, fps }))),

  addAssets: (assets) =>
    set((s) => withHistory(s, (p) => ({ ...p, assets: [...p.assets, ...assets] }))),

  addClipFromAsset: (assetId, trackType) =>
    set((s) => {
      const asset = s.project.assets.find((a) => a.id === assetId)
      if (!asset) return {}
      return withHistory(s, (p) => {
        const track = p.tracks.find((t) => t.type === trackType) || p.tracks[0]
        const end = track.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0)
        const clip: Clip = {
          id: uid(),
          trackId: track.id,
          assetId: asset.id,
          label: asset.name,
          start: end,
          duration: asset.duration ?? (asset.kind === 'image' ? 5 : 8),
          color: TRACK_COLORS[track.type],
          kind: track.type,
          opacity: 100,
          volume: 100,
        }
        track.clips.push(clip)
        return fit(p)
      })
    }),

  addSpecialClip: (partial) =>
    set((s) =>
      withHistory(s, (p) => {
        const track = p.tracks.find((t) => t.type === partial.kind) || p.tracks[0]
        const start = partial.start ?? s.currentTime
        const clip: Clip = {
          id: uid(),
          trackId: track.id,
          opacity: 100,
          volume: 100,
          ...partial,
          label: partial.label,
          start,
          duration: partial.duration ?? 4,
          color: partial.color ?? TRACK_COLORS[track.type],
          kind: partial.kind,
        }
        track.clips.push(clip)
        return fit(p)
      })
    ),

  updateClip: (id, patch) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === id)
          if (c) Object.assign(c, patch)
        }
        return fit(p)
      })
    ),

  addKeyframe: (clipId, atLocal) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === clipId)
          if (!c) continue
          const time = Math.max(0, Math.min(atLocal, c.duration))
          const values = {
            x: c.x ?? 0, y: c.y ?? 0, scale: c.scale ?? 1, rotate: c.rotate ?? 0,
            rotateX: c.rotateX ?? 0, rotateY: c.rotateY ?? 0, opacity: c.opacity ?? 100,
          }
          const kfs = c.keyframes ? [...c.keyframes] : []
          // 同時刻があれば置き換え
          const existing = kfs.findIndex((k) => Math.abs(k.time - time) < 0.05)
          const kf = { id: uid(), time, values, ease: 'easeInOut' as const }
          if (existing >= 0) kfs[existing] = kf
          else kfs.push(kf)
          kfs.sort((a, b) => a.time - b.time)
          c.keyframes = kfs
        }
        return p
      })
    ),

  removeKeyframe: (clipId, kfId) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === clipId)
          if (c && c.keyframes) {
            c.keyframes = c.keyframes.filter((k) => k.id !== kfId)
            if (c.keyframes.length === 0) delete c.keyframes
          }
        }
        return p
      })
    ),

  setAnimatedValue: (clipId, patch, atLocal) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === clipId)
          if (!c) continue
          if (c.keyframes && c.keyframes.length > 0) {
            // キーフレームあり → 再生ヘッド位置のキーフレームを更新/作成（自動キーフレーム）
            const time = Math.max(0, Math.min(atLocal, c.duration))
            const resolved = resolveClip(c, c.start + time)
            const snapshot: KeyframeValues = {
              x: resolved.x ?? 0, y: resolved.y ?? 0, scale: resolved.scale ?? 1, rotate: resolved.rotate ?? 0,
              rotateX: resolved.rotateX ?? 0, rotateY: resolved.rotateY ?? 0, opacity: resolved.opacity ?? 100,
              cropX: resolved.cropX ?? 0, cropY: resolved.cropY ?? 0, cropW: resolved.cropW ?? 100, cropH: resolved.cropH ?? 100,
            }
            const values = { ...snapshot, ...patch }
            const kfs = [...c.keyframes]
            const idx = kfs.findIndex((k) => Math.abs(k.time - time) < 0.05)
            if (idx >= 0) kfs[idx] = { ...kfs[idx], values }
            else kfs.push({ id: uid(), time, values, ease: 'easeInOut' })
            kfs.sort((a, b) => a.time - b.time)
            c.keyframes = kfs
          } else {
            // キーフレーム無し → 基準値を更新
            Object.assign(c, patch)
          }
        }
        return p
      })
    ),

  moveClip: (id, start) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === id)
          if (c) c.start = Math.max(0, start)
        }
        return fit(p)
      })
    ),

  removeClip: (id) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) t.clips = t.clips.filter((c) => c.id !== id)
        return fit(p)
      })
    ),

  duplicateClip: (id) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === id)
          if (c) {
            t.clips.push({ ...c, id: uid(), start: c.start + c.duration })
          }
        }
        return fit(p)
      })
    ),

  splitClip: (id, at) =>
    set((s) =>
      withHistory(s, (p) => {
        for (const t of p.tracks) {
          const c = t.clips.find((c) => c.id === id)
          if (c && at > c.start && at < c.start + c.duration) {
            const rightDur = c.start + c.duration - at
            const left = { ...c, duration: at - c.start }
            const right: Clip = { ...c, id: uid(), start: at, duration: rightDur }
            t.clips = t.clips.filter((x) => x.id !== id)
            t.clips.push(left, right)
          }
        }
        return fit(p)
      })
    ),

  selectClip: (id) => set({ selectedClipId: id }),

  updateTrack: (id, patch) =>
    set((s) => {
      const project = JSON.parse(JSON.stringify(s.project)) as Project
      const tr = project.tracks.find((t) => t.id === id)
      if (tr) Object.assign(tr, patch)
      return { project, dirty: true }
    }),

  addTrack: (type) =>
    set((s) =>
      withHistory(s, (p) => {
        const base = TRACK_DEFS.find((d) => d.type === type)?.name ?? type
        const same = p.tracks.filter((t) => t.type === type).length
        p.tracks.push({
          id: uid(),
          type,
          name: same > 0 ? `${base} ${same + 1}` : base,
          clips: [],
          locked: false,
          muted: false,
          hidden: false,
          solo: false,
          volume: 100,
        })
        return p
      })
    ),

  removeTrack: (id) =>
    set((s) => {
      const project = JSON.parse(JSON.stringify(s.project)) as Project
      project.tracks = project.tracks.filter((t) => t.id !== id)
      return {
        past: [...s.past.slice(-49), JSON.parse(JSON.stringify(s.project))],
        future: [],
        project,
        dirty: true,
      }
    }),

  moveTrack: (id, dir) =>
    set((s) => {
      const project = JSON.parse(JSON.stringify(s.project)) as Project
      const i = project.tracks.findIndex((t) => t.id === id)
      const j = dir === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= project.tracks.length) return {}
      const arr = project.tracks
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { project, dirty: true }
    }),

  moveTrackTo: (id, toIndex) =>
    set((s) => {
      const project = JSON.parse(JSON.stringify(s.project)) as Project
      const from = project.tracks.findIndex((t) => t.id === id)
      if (from < 0) return {}
      const to = Math.max(0, Math.min(project.tracks.length - 1, toIndex))
      if (from === to) return {}
      const [moved] = project.tracks.splice(from, 1)
      project.tracks.splice(to, 0, moved)
      return {
        past: [...s.past.slice(-49), JSON.parse(JSON.stringify(s.project))],
        future: [],
        project,
        dirty: true,
      }
    }),

  addClipFromAssetAt: (assetId, trackId, start) =>
    set((s) => {
      const asset = s.project.assets.find((a) => a.id === assetId)
      if (!asset) return {}
      return withHistory(s, (p) => {
        const track = p.tracks.find((t) => t.id === trackId) || p.tracks[0]
        const clip: Clip = {
          id: uid(),
          trackId: track.id,
          assetId: asset.id,
          label: asset.name,
          start: Math.max(0, start),
          duration: asset.duration ?? (asset.kind === 'image' ? 5 : 8),
          color: TRACK_COLORS[track.type],
          kind: track.type,
          opacity: 100,
          volume: 100,
        }
        track.clips.push(clip)
        return fit(p)
      })
    }),

  createCollage: (cells, start, duration) =>
    set((s) =>
      withHistory(s, (p) => {
        cells.forEach((cell, i) => {
          const asset = p.assets.find((a) => a.id === cell.assetId)
          if (!asset) return
          const track = {
            id: uid(),
            type: 'video' as const,
            name: `コラージュ ${i + 1}`,
            clips: [] as Clip[],
            locked: false, muted: false, hidden: false, solo: false, volume: 100,
          }
          const clip: Clip = {
            id: uid(),
            trackId: track.id,
            assetId: asset.id,
            label: asset.name,
            start: Math.max(0, start),
            duration: duration || asset.duration || (asset.kind === 'image' ? 5 : 8),
            color: TRACK_COLORS.video,
            kind: 'video',
            opacity: 100,
            volume: 100,
            x: cell.x,
            y: cell.y,
            scale: cell.scale,
            layer: cell.layer ?? i,
            borderWidth: cell.borderWidth,
            borderColor: cell.borderColor,
            borderRadius: cell.borderRadius,
            frameShadow: cell.frameShadow,
          }
          track.clips.push(clip)
          p.tracks.push(track)
        })
        return fit(p)
      })
    ),

  addTelop: (text = 'テロップ') =>
    set((s) =>
      withHistory(s, (p) => {
        const track = p.tracks.find((t) => t.type === 'subtitle') || p.tracks[0]
        const clip: Clip = {
          id: uid(),
          trackId: track.id,
          kind: 'subtitle',
          label: text,
          text,
          start: s.currentTime,
          duration: 4,
          color: TRACK_COLORS.subtitle,
          fontColor: '#ffffff',
          fontSize: 48,
          opacity: 100,
          x: 0,
          y: 0,
          scale: 1,
        }
        track.clips.push(clip)
        return fit(p)
      })
    ),

  addTelopLines: (text, perLine = 3) =>
    set((s) =>
      withHistory(s, (p) => {
        const track = p.tracks.find((t) => t.type === 'lyrics') || p.tracks[0]
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
        let start = s.currentTime
        for (const line of lines) {
          track.clips.push({
            id: uid(),
            trackId: track.id,
            kind: 'lyrics',
            label: line,
            text: line,
            start,
            duration: perLine,
            color: TRACK_COLORS.lyrics,
            fontColor: '#ffffff',
            fontSize: 48,
            opacity: 100,
            x: 0,
            y: 0,
            scale: 1,
          })
          start += perLine
        }
        return fit(p)
      })
    ),

  setCurrentTime: (t) => set({ currentTime: Math.max(0, t) }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (p) => set({ playing: p }),
  setZoom: (z) => set({ zoom: Math.min(60, Math.max(4, z)) }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {}
      const prev = s.past[s.past.length - 1]
      return {
        project: prev,
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future].slice(0, 50),
        dirty: true,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {}
      const next = s.future[0]
      return {
        project: next,
        future: s.future.slice(1),
        past: [...s.past, s.project].slice(-50),
        dirty: true,
      }
    }),

  markSaved: (filePath) => set({ dirty: false, filePath }),

  pushRecent: (item) =>
    set((s) => ({
      recent: [item, ...s.recent.filter((r) => r.path !== item.path)].slice(0, 8),
    })),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  openModal: (m) => set({ modal: m }),
}))

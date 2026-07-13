import { create } from 'zustand'
import type { Project, Track, Clip, MediaAsset, Settings, TrackType } from '@/types'
import { TRACK_DEFS, TRACK_COLORS } from '@/lib/catalog'

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
  modal: null | 'settings' | 'export'

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
  moveClip: (id: string, start: number) => void
  removeClip: (id: string) => void
  duplicateClip: (id: string) => void
  splitClip: (id: string, at: number) => void
  selectClip: (id?: string) => void

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

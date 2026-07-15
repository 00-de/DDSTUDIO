import {
  doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { useStore } from '@/store/useStore'
import type { Clip, Track, Project } from '@/types'

export interface Peer {
  id: string
  name: string
  color: string
  currentTime: number
  selectedClipId?: string
  at: number
}

const COLORS = ['#3B82F6', '#22C55E', '#A855F7', '#EC4899', '#F97316', '#06B6D4', '#EAB308', '#EF4444', '#14B8A6', '#8B5CF6']

let unsubs: (() => void)[] = []
let roomId = ''
let userId = ''
let userName = ''
let userColor = ''
let applyingRemote = false
let lastSent = new Map<string, string>()   // docId -> JSON
let presenceTimer: ReturnType<typeof setInterval> | null = null
let storeUnsub: (() => void) | null = null

export function myId() { return userId }
export function myColor() { return userColor }
export function currentRoom() { return roomId }

const clipKey = (c: Clip) => 'c:' + c.id
const trackKey = (t: Track) => 't:' + t.id

function stripClip(c: Clip) { return JSON.parse(JSON.stringify(c)) }
function stripTrack(t: Track) {
  const { clips, ...rest } = t
  return JSON.parse(JSON.stringify(rest))
}

/** ルームに参加。既存ルームがあれば取り込み、無ければ現在のプロジェクトで作成 */
export async function joinRoom(opts: { room: string; name: string }): Promise<{ ok: boolean; error?: string }> {
  const db = getDb()
  if (!db) return { ok: false, error: 'Firebase の設定がありません。' }

  await leaveRoom()

  roomId = opts.room.trim()
  userName = opts.name.trim() || '名無し'
  userId = localStorage.getItem('dds.uid') || Math.random().toString(36).slice(2, 10)
  localStorage.setItem('dds.uid', userId)
  userColor = COLORS[Math.abs(hash(userId)) % COLORS.length]

  try {
    const metaRef = doc(db, 'rooms', roomId)
    const snap = await getDoc(metaRef)

    if (!snap.exists()) {
      // 新規ルーム：現在のプロジェクトをアップロード
      const p = useStore.getState().project
      await setDoc(metaRef, {
        name: p.name, resolution: p.resolution, fps: p.fps,
        durationSec: p.durationSec, assets: p.assets, version: p.version,
        updatedAt: serverTimestamp(),
      })
      for (const t of p.tracks) {
        await setDoc(doc(db, 'rooms', roomId, 'tracks', t.id), { ...stripTrack(t), order: p.tracks.indexOf(t) })
        for (const c of t.clips) await setDoc(doc(db, 'rooms', roomId, 'clips', c.id), stripClip(c))
      }
    }

    startListening(db)
    startPresence(db)
    startPushing(db)
    useStore.setState({ collabRoom: roomId, collabOn: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function leaveRoom() {
  unsubs.forEach((u) => u())
  unsubs = []
  if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null }
  if (storeUnsub) { storeUnsub(); storeUnsub = null }
  const db = getDb()
  if (db && roomId && userId) {
    try { await deleteDoc(doc(db, 'rooms', roomId, 'presence', userId)) } catch { /* noop */ }
  }
  lastSent.clear()
  roomId = ''
  useStore.setState({ collabRoom: '', collabOn: false, peers: [] })
}

/* ---------- 受信：Firestore → ローカル ---------- */
function startListening(db: NonNullable<ReturnType<typeof getDb>>) {
  // メタ情報
  unsubs.push(onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    const d = snap.data()
    if (!d) return
    applyingRemote = true
    useStore.setState((s) => {
      const p = { ...s.project }
      p.name = d.name ?? p.name
      p.resolution = d.resolution ?? p.resolution
      p.fps = d.fps ?? p.fps
      p.durationSec = d.durationSec ?? p.durationSec
      if (Array.isArray(d.assets)) p.assets = d.assets
      return { project: p }
    })
    applyingRemote = false
  }))

  // トラック
  unsubs.push(onSnapshot(collection(db, 'rooms', roomId, 'tracks'), (qs) => {
    applyingRemote = true
    useStore.setState((s) => {
      const p = JSON.parse(JSON.stringify(s.project)) as Project
      const byId = new Map(p.tracks.map((t) => [t.id, t]))
      const seen = new Set<string>()
      const ordered: { order: number; track: Track }[] = []

      qs.forEach((docSnap) => {
        const d = docSnap.data() as Omit<Track, 'clips'> & { order?: number }
        seen.add(docSnap.id)
        const exist = byId.get(docSnap.id)
        const t: Track = exist ? { ...exist, ...d, clips: exist.clips } : { ...(d as unknown as Track), clips: [] }
        ordered.push({ order: d.order ?? 999, track: t })
        lastSent.set('t:' + docSnap.id, JSON.stringify(stripTrack(t)))
      })
      // 削除されたトラック
      ordered.sort((a, b) => a.order - b.order)
      p.tracks = ordered.map((o) => o.track)
      for (const id of byId.keys()) if (!seen.has(id)) { /* removed remotely */ }
      return { project: p }
    })
    applyingRemote = false
  }))

  // クリップ
  unsubs.push(onSnapshot(collection(db, 'rooms', roomId, 'clips'), (qs) => {
    applyingRemote = true
    useStore.setState((s) => {
      const p = JSON.parse(JSON.stringify(s.project)) as Project
      const remote = new Map<string, Clip>()
      qs.forEach((d) => {
        const c = d.data() as Clip
        remote.set(d.id, c)
        lastSent.set('c:' + d.id, JSON.stringify(c))
      })
      // 全トラックのクリップを作り直す
      for (const t of p.tracks) t.clips = []
      for (const c of remote.values()) {
        const t = p.tracks.find((t) => t.id === c.trackId)
        if (t) t.clips.push(c)
      }
      return { project: p }
    })
    applyingRemote = false
  }))

  // 参加者
  unsubs.push(onSnapshot(collection(db, 'rooms', roomId, 'presence'), (qs) => {
    const now = Date.now()
    const peers: Peer[] = []
    qs.forEach((d) => {
      const p = d.data() as Peer
      if (d.id === userId) return
      if (now - (p.at ?? 0) < 20000) peers.push({ ...p, id: d.id })
    })
    useStore.setState({ peers })
  }))
}

/* ---------- 送信：ローカル → Firestore ---------- */
function startPushing(db: NonNullable<ReturnType<typeof getDb>>) {
  let queued = false
  const push = async () => {
    queued = false
    if (applyingRemote || !roomId) return
    const p = useStore.getState().project
    try {
      // クリップ
      const liveIds = new Set<string>()
      for (const t of p.tracks) {
        for (const c of t.clips) {
          liveIds.add(c.id)
          const json = JSON.stringify(stripClip(c))
          if (lastSent.get(clipKey(c)) !== json) {
            lastSent.set(clipKey(c), json)
            await setDoc(doc(db, 'rooms', roomId, 'clips', c.id), { ...stripClip(c), _by: userId })
          }
        }
      }
      // ローカルで消えたクリップ
      for (const key of Array.from(lastSent.keys())) {
        if (!key.startsWith('c:')) continue
        const id = key.slice(2)
        if (!liveIds.has(id)) {
          lastSent.delete(key)
          await deleteDoc(doc(db, 'rooms', roomId, 'clips', id)).catch(() => {})
        }
      }
      // トラック
      const liveTracks = new Set<string>()
      for (let i = 0; i < p.tracks.length; i++) {
        const t = p.tracks[i]
        liveTracks.add(t.id)
        const json = JSON.stringify({ ...stripTrack(t), order: i })
        if (lastSent.get(trackKey(t)) !== json) {
          lastSent.set(trackKey(t), json)
          await setDoc(doc(db, 'rooms', roomId, 'tracks', t.id), { ...stripTrack(t), order: i })
        }
      }
      for (const key of Array.from(lastSent.keys())) {
        if (!key.startsWith('t:')) continue
        const id = key.slice(2)
        if (!liveTracks.has(id)) {
          lastSent.delete(key)
          await deleteDoc(doc(db, 'rooms', roomId, 'tracks', id)).catch(() => {})
        }
      }
      // メタ
      const metaJson = JSON.stringify({ name: p.name, resolution: p.resolution, fps: p.fps, durationSec: p.durationSec, assets: p.assets })
      if (lastSent.get('meta') !== metaJson) {
        lastSent.set('meta', metaJson)
        await setDoc(doc(db, 'rooms', roomId), {
          name: p.name, resolution: p.resolution, fps: p.fps,
          durationSec: p.durationSec, assets: p.assets, updatedAt: serverTimestamp(),
        }, { merge: true })
      }
    } catch (e) {
      console.error('同期エラー:', e)
    }
  }

  storeUnsub = useStore.subscribe(() => {
    if (queued || applyingRemote) return
    queued = true
    setTimeout(push, 220) // まとめて送る
  })
}

/* ---------- 参加者情報 ---------- */
function startPresence(db: NonNullable<ReturnType<typeof getDb>>) {
  const send = async () => {
    if (!roomId) return
    const s = useStore.getState()
    try {
      await setDoc(doc(db, 'rooms', roomId, 'presence', userId), {
        name: userName, color: userColor,
        currentTime: s.currentTime,
        selectedClipId: s.selectedClipId ?? null,
        at: Date.now(),
      })
    } catch { /* noop */ }
  }
  send()
  presenceTimer = setInterval(send, 3000)
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

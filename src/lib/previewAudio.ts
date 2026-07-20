// プレビュー音声エンジン：タイムラインの音声を実際に再生し、
// WebAudio でレベルを解析して音量メーターを駆動する。
import { useStore } from '@/store/useStore'
import type { Project, Clip } from '@/types'

interface Node {
  el: HTMLAudioElement
  src: MediaElementAudioSourceNode
  gain: GainNode
  pan: StereoPannerNode
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let splitter: ChannelSplitterNode | null = null
let anL: AnalyserNode | null = null
let anR: AnalyserNode | null = null
let bufL: Uint8Array<ArrayBuffer> | null = null
let bufR: Uint8Array<ArrayBuffer> | null = null
const nodes = new Map<string, Node>()      // clipId -> node
let smoothL = 0
let smoothR = 0

function ensure() {
  if (ctx) return
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 1
  splitter = ctx.createChannelSplitter(2)
  anL = ctx.createAnalyser(); anL.fftSize = 512
  anR = ctx.createAnalyser(); anR.fftSize = 512
  bufL = new Uint8Array(new ArrayBuffer(anL.fftSize))
  bufR = new Uint8Array(new ArrayBuffer(anR.fftSize))
  master.connect(splitter)
  splitter.connect(anL, 0)
  splitter.connect(anR, 1)
  master.connect(ctx.destination)
}

function nodeFor(clipId: string, url: string): Node | null {
  let n = nodes.get(clipId)
  if (n) return n
  if (!ctx || !master) return null
  try {
    const el = document.createElement('audio')
    el.src = url
    el.preload = 'auto'
    const src = ctx.createMediaElementSource(el)
    const gain = ctx.createGain()
    const pan = ctx.createStereoPanner()
    src.connect(gain); gain.connect(pan); pan.connect(master)
    n = { el, src, gain, pan }
    nodes.set(clipId, n)
    return n
  } catch {
    return null
  }
}

function rms(buf: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / buf.length)
}

/** 毎フレーム呼ぶ：再生同期＋レベル取得。戻り値は [L,R]（0〜1） */
export function tick(): [number, number] {
  const s = useStore.getState()
  const { project, currentTime: t, playing } = s

  const hasAudio = project.tracks.some((tr) => (tr.type === 'audio' || tr.type === 'video') && tr.clips.length > 0)
  if (!ctx && (!playing || !hasAudio)) return [0, 0]

  ensure()
  if (ctx!.state === 'suspended' && playing) ctx!.resume().catch(() => {})

  if (!playing) {
    for (const n of nodes.values()) if (!n.el.paused) n.el.pause()
    smoothL *= 0.8; smoothR *= 0.8
    return [smoothL, smoothR]
  }

  const anySolo = project.tracks.some((tr) => tr.solo)
  const live = new Set<string>()

  for (const tr of project.tracks) {
    if (tr.type !== 'audio' && tr.type !== 'video') continue
    const trackAudible = !tr.muted && !(anySolo && !tr.solo)
    const trVol = (tr.volume ?? 100) / 100
    for (const c of tr.clips) {
      const asset = project.assets.find((a) => a.id === c.assetId)
      if (!asset || (asset.kind !== 'audio' && asset.kind !== 'video')) continue
      const active = t >= c.start && t < c.start + c.duration
      if (!active) continue
      live.add(c.id)
      const n = nodeFor(c.id, asset.url)
      if (!n) continue
      const vol = trackAudible && !c.muted ? ((c.volume ?? 100) / 100) * trVol : 0
      n.gain.gain.value = vol
      n.pan.pan.value = clamp((c.pan ?? 0) / 100, -1, 1)
      n.el.playbackRate = c.speed ?? 1
      const local = (t - c.start) * (c.speed ?? 1)
      if (Math.abs(n.el.currentTime - local) > 0.3) { try { n.el.currentTime = Math.max(0, local) } catch { /* noop */ } }
      if (n.el.paused) n.el.play().catch(() => {})
    }
  }
  // 非アクティブは一時停止
  for (const [id, n] of nodes) if (!live.has(id) && !n.el.paused) n.el.pause()

  // レベル計測
  let l = 0, r = 0
  if (anL && anR && bufL && bufR) {
    anL.getByteTimeDomainData(bufL)
    anR.getByteTimeDomainData(bufR)
    l = Math.min(1, rms(bufL) * 2.2)
    r = Math.min(1, rms(bufR) * 2.2)
  }
  smoothL = l > smoothL ? l : smoothL * 0.82 + l * 0.18
  smoothR = r > smoothR ? r : smoothR * 0.82 + r * 0.18
  return [smoothL, smoothR]
}

export function stopPreviewAudio() {
  for (const n of nodes.values()) { try { n.el.pause() } catch { /* noop */ } }
}

function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)) }

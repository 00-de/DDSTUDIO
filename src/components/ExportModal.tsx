import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'
import { Compositor, resWH, type MediaEl } from '@/lib/baker'
import type { Clip } from '@/types'

const FORMATS = ['mp4', 'mov', 'mkv', 'webm']
const RESOLUTIONS: { id: '720p' | '1080p' | '2k' | '4k'; label: string }[] = [
  { id: '720p', label: '720P' }, { id: '1080p', label: '1080P' }, { id: '2k', label: '2K' }, { id: '4k', label: '4K' },
]

function abToB64(buf: ArrayBuffer): string {
  let bin = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  return btoa(bin)
}

export default function ExportModal() {
  const project = useStore((s) => s.project)
  const close = () => useStore.getState().openModal(null)

  const [format, setFormat] = useState('mp4')
  const [resolution, setResolution] = useState(project.resolution)
  const [fps, setFps] = useState(project.fps)
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'quality'>('balanced')
  const [encoder, setEncoder] = useState('')
  const [busy, setBusy] = useState(false)
  const [bakeProgress, setBakeProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [done, setDone] = useState<{ ok: boolean; msg: string; filePath?: string } | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => { window.dds?.detectEncoder().then(setEncoder).catch(() => {}) }, [])

  const videoClips = project.tracks
    .filter((t) => t.type === 'video')
    .flatMap((t) => t.clips)
    .sort((a, b) => a.start - b.start)
    .map((c) => project.assets.find((a) => a.id === c.assetId))
    .filter((a): a is NonNullable<typeof a> => !!a && a.kind === 'video')
    .map((a) => ({ path: a.path }))

  useEffect(() => {
    const off = window.dds?.onExportProgress((line) => {
      const m = line.match(/time=(\d+:\d+:\d+\.\d+)/)
      if (m) setPhase('変換中… ' + m[1])
    })
    return () => off?.()
  }, [])

  // ===== 高速書き出し（動画トラック連結のみ・演出なし）=====
  const runFast = async () => {
    if (videoClips.length === 0) { setDone({ ok: false, msg: '「動画」トラックに動画クリップがありません。' }); return }
    setBusy(true); setDone(null); setPhase('連結中…')
    const outFmt = ['mov', 'mkv', 'webm', 'avi'].includes(format) ? format : 'mp4'
    const res = await window.dds.exportVideo({ clips: videoClips, format: outFmt, resolution, fps })
    setBusy(false)
    if (res.ok) setDone({ ok: true, msg: '書き出しが完了しました。', filePath: res.filePath })
    else if (!res.canceled) setDone({ ok: false, msg: res.error ?? '失敗しました。' })
  }

  // ===== 演出ごと書き出し（高速：フレーム送り込み方式）=====
  const runBakeFast = async () => {
    const hasVisual = project.tracks.some((t) => (t.type === 'video' || t.type === 'image') && t.clips.length > 0)
    if (!hasVisual) { setDone({ ok: false, msg: '映像（動画/画像）クリップがありません。先に配置してください。' }); return }

    setBusy(true); setDone(null); setBakeProgress(0); setPhase('準備中…')
    const [w, h] = resWH(resolution)
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const comp = new Compositor(w, h)

    // 素材読み込み
    const mediaMap = new Map<string, MediaEl>()
    const videoOf = new Map<HTMLVideoElement, Clip>()
    const loads: Promise<void>[] = []
    for (const tr of project.tracks) {
      if (tr.type !== 'video' && tr.type !== 'image') continue
      for (const c of tr.clips) {
        const asset = project.assets.find((a) => a.id === c.assetId)
        if (!asset) continue
        if (asset.kind === 'video') {
          const v = document.createElement('video')
          v.src = asset.url; v.preload = 'auto'; v.muted = true; v.playsInline = true
          mediaMap.set(c.id, v); videoOf.set(v, c)
          loads.push(new Promise<void>((res) => { if (v.readyState >= 2) return res(); v.onloadeddata = () => res(); v.onerror = () => res(); setTimeout(res, 6000) }))
        } else {
          const img = new Image(); img.src = asset.url
          mediaMap.set(c.id, img)
          loads.push(new Promise<void>((res) => { if (img.complete) return res(); img.onload = () => res(); img.onerror = () => res(); setTimeout(res, 6000) }))
        }
      }
    }
    await Promise.all(loads)

    const start = await window.dds.bakeStart({ width: w, height: h, fps, format: ['mov', 'mkv', 'webm'].includes(format) ? format : 'mp4', quality })
    if (!start.ok) {
      setBusy(false)
      if (!start.canceled) setDone({ ok: false, msg: start.error ?? '開始に失敗しました。' })
      return
    }
    setEncoder(start.encoder ?? '')
    setPhase(`レンダリング中…（${encLabel(start.encoder)}）`)

    const total = Math.ceil(project.durationSec * fps)
    const frameDt = 1 / fps
    const t0 = performance.now()
    cancelRef.current = false

    // 指定時刻へ正確にシーク
    const seekTo = (v: HTMLVideoElement, time: number) => new Promise<void>((res) => {
      if (Math.abs(v.currentTime - time) < 0.001) return res()
      let settled = false
      const ok = () => { if (settled) return; settled = true; v.removeEventListener('seeked', ok); res() }
      v.addEventListener('seeked', ok)
      try { v.currentTime = time } catch { ok() }
      setTimeout(ok, 250)
    })

    try {
      for (let i = 0; i < total; i++) {
        if (cancelRef.current) { await window.dds.bakeCancel(); setBusy(false); setPhase(''); setBakeProgress(0); return }
        const t = i * frameDt

        // 動画クリップを該当時刻へシーク（実時間再生ではなくフレーム単位）
        for (const [v, c] of videoOf) {
          if (t >= c.start && t < c.start + c.duration) {
            const local = (t - c.start) * (c.speed ?? 1)
            await seekTo(v, Math.max(0, Math.min(local, (v.duration || local) - 0.001)))
          }
        }

        comp.drawFrame(ctx, project, t, frameDt, mediaMap)
        const img = ctx.getImageData(0, 0, w, h)
        const r = await window.dds.bakeFrame(img.data.buffer as ArrayBuffer)
        if (!r.ok) throw new Error(r.error ?? 'フレーム書き込み失敗')

        if (i % 3 === 0) {
          const prog = (i + 1) / total
          setBakeProgress(prog)
          const el = (performance.now() - t0) / 1000
          const eta = prog > 0.02 ? Math.max(0, el / prog - el) : 0
          const speed = (i + 1) / fps / Math.max(0.001, el)
          setPhase(`レンダリング中… ${Math.round(prog * 100)}%　残り約${fmtEta(eta)}　(${speed.toFixed(1)}x)`)
          await new Promise((r2) => setTimeout(r2, 0)) // UI 更新
        }
      }

      setPhase('音声を合成中…')
      const audioParts = collectAudio(project)
      const fin = await window.dds.bakeFinish({ audio: audioParts, totalDuration: project.durationSec })
      setBusy(false); setBakeProgress(0); setPhase('')
      if (fin.ok) setDone({ ok: true, msg: fin.hasAudio ? '演出＋音声の書き出しが完了しました🎬' : '演出ごとの書き出しが完了しました🎬（音声トラックなし）', filePath: fin.filePath })
      else setDone({ ok: false, msg: fin.error ?? '失敗しました。' })
    } catch (err) {
      await window.dds.bakeCancel()
      setBusy(false); setBakeProgress(0); setPhase('')
      setDone({ ok: false, msg: String(err) })
    }
  }

  // ===== 演出ごと書き出し（WYSIWYG 合成）=====
  const runBake = async () => {
    const hasVisual = project.tracks.some((t) => (t.type === 'video' || t.type === 'image') && t.clips.length > 0)
    if (!hasVisual) { setDone({ ok: false, msg: '映像（動画/画像）クリップがありません。先に配置してください。' }); return }

    setBusy(true); setDone(null); setBakeProgress(0); setPhase('準備中…')
    const [w, h] = resWH(resolution)
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    const comp = new Compositor(w, h)

    const mediaMap = new Map<string, MediaEl>()
    const audioEls: HTMLMediaElement[] = []
    const allMedia: HTMLMediaElement[] = []
    const clipOf = new Map<HTMLMediaElement, Clip>()

    for (const tr of project.tracks) {
      for (const c of tr.clips) {
        const asset = project.assets.find((a) => a.id === c.assetId)
        if (!asset) continue
        if (tr.type === 'video' || tr.type === 'image') {
          if (asset.kind === 'video') {
            const v = document.createElement('video'); v.src = asset.url; v.preload = 'auto'; (v as HTMLVideoElement).playsInline = true
            mediaMap.set(c.id, v); allMedia.push(v); clipOf.set(v, c)
          } else {
            const img = new Image(); img.src = asset.url; mediaMap.set(c.id, img)
          }
        } else if (tr.type === 'audio' && asset.kind === 'audio') {
          const a = document.createElement('audio'); a.src = asset.url; a.preload = 'auto'
          audioEls.push(a); allMedia.push(a); clipOf.set(a, c)
        }
      }
    }

    // メタデータ読み込み待ち
    await Promise.all(allMedia.map((el) => new Promise<void>((res) => {
      if (el.readyState >= 1) return res()
      el.onloadedmetadata = () => res(); el.onerror = () => res(); setTimeout(res, 4000)
    })))
    await Promise.all([...mediaMap.values()].filter((e) => e instanceof HTMLImageElement).map((img) => new Promise<void>((res) => {
      const im = img as HTMLImageElement
      if (im.complete) return res(); im.onload = () => res(); im.onerror = () => res(); setTimeout(res, 4000)
    })))

    // 音声ミックス（可能なら）
    let audioCtx: AudioContext | null = null
    let audioTracks: MediaStreamTrack[] = []
    try {
      audioCtx = new AudioContext()
      const dest = audioCtx.createMediaStreamDestination()
      for (const el of allMedia) {
        try { const s = audioCtx.createMediaElementSource(el); s.connect(dest) } catch { /* skip */ }
      }
      audioTracks = dest.stream.getAudioTracks()
    } catch { audioCtx = null }

    const stream = canvas.captureStream(fps)
    for (const tk of audioTracks) stream.addTrack(tk)

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: resolution === '4k' ? 40_000_000 : resolution === '2k' ? 24_000_000 : 12_000_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    const finished = new Promise<Blob>((resolve) => { rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })) })

    const duration = project.durationSec
    setPhase('録画中…（実時間で進みます）')
    const startT = performance.now()
    let lastT = 0
    rec.start()

    const cleanup = () => { allMedia.forEach((e) => { try { e.pause() } catch { /* noop */ } }); if (audioCtx) audioCtx.close().catch(() => {}) }

    const loop = () => {
      const t = (performance.now() - startT) / 1000
      if (t >= duration) { rec.stop(); cleanup(); return }
      const dt = Math.min(0.05, Math.max(0.001, t - lastT)); lastT = t

      // 映像クリップの再生同期
      for (const [el, c] of clipOf) {
        const on = t >= c.start && t < c.start + c.duration
        if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) {
          if (on) {
            const local = (t - c.start) * (el instanceof HTMLVideoElement ? (c.speed ?? 1) : 1)
            if (Math.abs(el.currentTime - local) > 0.35) { try { el.currentTime = Math.max(0, local) } catch { /* noop */ } }
            if (el.paused) el.play().catch(() => {})
          } else if (!el.paused) el.pause()
        }
      }

      comp.drawFrame(ctx, project, t, dt, mediaMap)
      setBakeProgress(Math.min(1, t / duration))
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    const blob = await finished
    setPhase('MP4 に変換中…')
    const b64 = abToB64(await blob.arrayBuffer())
    const outFmt = ['mov', 'mkv', 'webm'].includes(format) ? format : 'mp4'
    const res = await window.dds.saveBakedVideo(b64, outFmt)
    setBusy(false); setBakeProgress(0); setPhase('')
    if (res.ok) setDone({ ok: true, msg: '演出ごとの書き出しが完了しました🎬', filePath: res.filePath })
    else if (!res.canceled) setDone({ ok: false, msg: res.error ?? '失敗しました。' })
  }

  return (
    <ModalShell title="書き出し" onClose={busy ? () => {} : close} wide>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">形式</div>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => <Pill key={f} active={format === f} onClick={() => setFormat(f)}>{f.toUpperCase()}</Pill>)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">解像度</div>
          <div className="flex gap-2 flex-wrap">
            {RESOLUTIONS.map((r) => <Pill key={r.id} active={resolution === r.id} onClick={() => setResolution(r.id)}>{r.label}</Pill>)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">フレームレート</div>
          <div className="flex gap-2">
            <Pill active={fps === 30} onClick={() => setFps(30)}>30fps</Pill>
            <Pill active={fps === 60} onClick={() => setFps(60)}>60fps</Pill>
          </div>
        </div>

        <div>
          <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">レンダリング品質 / 速度</div>
          <div className="flex gap-2 flex-wrap">
            <Pill active={quality === 'fast'} onClick={() => setQuality('fast')}>高速優先</Pill>
            <Pill active={quality === 'balanced'} onClick={() => setQuality('balanced')}>バランス</Pill>
            <Pill active={quality === 'quality'} onClick={() => setQuality('quality')}>画質優先</Pill>
          </div>
          {encoder && (
            <div className="text-[11px] text-stage-600 mt-1.5">
              エンコーダー: <b className={encoder === 'libx264' ? '' : 'text-dream-violet'}>{encLabel(encoder)}</b>
              {encoder === 'libx264' && '（GPUエンコーダーが見つからないためCPUを使用します）'}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-stage-850 border border-stage-800 p-3 text-[11px] text-stage-600 leading-relaxed">
          <b className="text-dream-violet">演出ごと書き出し</b>：背景・テロップ・エフェクト・トランジション・カメラ演出に加え、<b>音声（音楽トラック＋動画の音）</b>も含めて書き出します。GPUを使って実時間より高速にレンダリングします。<br />
          <b>音声も含める(旧)</b>：実時間で録画する従来方式（うまくいかない時の予備）。<br />
          <b>高速書き出し</b>：動画トラックの連結のみ（演出なし・最速）。
        </div>

        {busy && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-sm text-dream-cyan">
              <span className="w-4 h-4 border-2 border-dream-cyan border-t-transparent rounded-full animate-spin" />
              {phase}
            </div>
            {bakeProgress > 0 && (
              <div className="h-2 bg-stage-950 rounded-full overflow-hidden">
                <div className="h-full dream-gradient" style={{ width: `${Math.round(bakeProgress * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {done && (
          <div className={'text-sm rounded-lg p-3 ' + (done.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500')}>
            {done.msg}
            {done.ok && done.filePath && (
              <button onClick={() => window.dds.showInFolder(done.filePath!)} className="ml-2 underline hover:text-dream-violet">フォルダを開く</button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {busy ? (
          <button onClick={() => { cancelRef.current = true }} className="px-4 py-2 rounded-md border border-red-400 text-red-500 hover:bg-red-500/10 font-semibold">
            中止
          </button>
        ) : (
          <>
            <button onClick={close} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600">キャンセル</button>
            <button onClick={runFast} className="px-3 py-2 rounded-md border border-stage-700 text-stage-600 hover:border-dream-violet hover:text-dream-violet text-sm">高速書き出し</button>
            <button onClick={runBake} className="px-3 py-2 rounded-md border border-stage-700 text-stage-600 hover:border-dream-violet hover:text-dream-violet text-sm">実時間録画(旧)</button>
            <button onClick={runBakeFast} className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow">演出ごと書き出し</button>
          </>
        )}
      </div>
    </ModalShell>
  )
}

function encLabel(enc?: string): string {
  switch (enc) {
    case 'h264_nvenc': return 'NVIDIA GPU (NVENC)'
    case 'h264_amf': return 'AMD GPU (AMF)'
    case 'h264_qsv': return 'Intel GPU (QSV)'
    case 'libx264': return 'CPU (x264)'
    default: return enc || '判定中'
  }
}

function fmtEta(sec: number): string {
  if (sec < 60) return `${Math.ceil(sec)}秒`
  const m = Math.floor(sec / 60)
  const s = Math.ceil(sec % 60)
  return `${m}分${s}秒`
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={'px-3 py-1.5 rounded-md text-sm transition-colors ' + (active ? 'dream-gradient text-white' : 'border border-stage-700 text-stage-600 hover:border-dream-violet hover:text-dream-violet')}>
      {children}
    </button>
  )
}

// タイムラインから音声パート（音楽トラック＋動画クリップの音）を集める
function collectAudio(project: ReturnType<typeof useStore.getState>['project']) {
  const parts: {
    path: string; start: number; inPoint: number; duration: number
    volume: number; fadeIn?: number; fadeOut?: number; speed?: number
  }[] = []
  const anySolo = project.tracks.some((t) => t.solo)

  for (const tr of project.tracks) {
    if (tr.type !== 'audio' && tr.type !== 'video') continue
    if (tr.muted) continue
    if (anySolo && !tr.solo) continue
    const trVol = (tr.volume ?? 100) / 100

    for (const c of tr.clips) {
      if (c.muted) continue
      const asset = project.assets.find((a) => a.id === c.assetId)
      if (!asset) continue
      if (asset.kind !== 'audio' && asset.kind !== 'video') continue
      const vol = ((c.volume ?? 100) / 100) * trVol
      if (vol <= 0) continue
      parts.push({
        path: asset.path,
        start: c.start,
        inPoint: 0,
        duration: c.duration,
        volume: vol,
        fadeIn: c.fadeIn,
        fadeOut: c.fadeOut,
        speed: tr.type === 'video' ? c.speed : undefined,
      })
    }
  }
  return parts
}

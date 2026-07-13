import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '@/store/useStore'
import type { Clip } from '@/types'
import EffectsCanvas from '@/components/EffectsCanvas'

const RES_LABEL: Record<string, string> = { '720p': '1280×720', '1080p': '1920×1080', '2k': '2560×1440', '4k': '3840×2160' }

// 背景ラベル → CSS
function bgStyle(label?: string): React.CSSProperties {
  switch (label) {
    case '単色': return { background: '#0b0c11' }
    case 'グラデーション': return { background: 'linear-gradient(120deg,#22d3ee,#a855f7,#ec4899)' }
    case '宇宙': return { background: 'radial-gradient(circle at 30% 20%, #1e1b4b, #05060a), radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1px 1px at 40% 80%, #fff, transparent)' }
    case '海': return { background: 'linear-gradient(180deg,#0ea5e9,#0369a1,#082f49)' }
    case '夜景': return { background: 'linear-gradient(180deg,#0f172a,#1e293b), radial-gradient(2px 2px at 30% 80%, #fbbf24, transparent), radial-gradient(2px 2px at 60% 85%, #f59e0b, transparent)' }
    case '桜並木': return { background: 'linear-gradient(180deg,#fbcfe8,#f9a8d4,#be185d)' }
    case 'ステージ': return { background: 'radial-gradient(circle at 50% 0%, #4c1d95, #1e1b4b 60%, #05060a)' }
    case 'ライブLED': return { background: 'repeating-linear-gradient(90deg,#7c3aed 0 6px,#0b0c11 6px 12px), repeating-linear-gradient(0deg,#ec4899 0 6px,transparent 6px 12px)' }
    case 'スクリーン': return { background: 'linear-gradient(180deg,#e2e8f0,#94a3b8)' }
    default: return { background: 'linear-gradient(135deg,#1e1b4b,#4c1d95,#831843)' }
  }
}

function activeClips(tracks: ReturnType<typeof useStore.getState>['project']['tracks'], t: number, types: string[]) {
  const out: Clip[] = []
  for (const tr of tracks) {
    if (tr.hidden || !types.includes(tr.type)) continue
    for (const c of tr.clips) if (t >= c.start && t < c.start + c.duration) out.push(c)
  }
  return out
}

// クリップの現在の不透明度（フェード込み）
function clipOpacity(c: Clip, t: number): number {
  let op = (c.opacity ?? 100) / 100
  const local = t - c.start
  if (c.fadeIn && local < c.fadeIn) op *= Math.max(0, local / c.fadeIn)
  if (c.fadeOut && c.duration - local < c.fadeOut) op *= Math.max(0, (c.duration - local) / c.fadeOut)
  return op
}

export default function Preview() {
  const project = useStore((s) => s.project)
  const t = useStore((s) => s.currentTime)
  const playing = useStore((s) => s.playing)
  const videoRef = useRef<HTMLVideoElement>(null)

  const visual = useMemo(() => {
    const clips = activeClips(project.tracks, t, ['video', 'image'])
    return clips[clips.length - 1]
  }, [project.tracks, t])

  const asset = visual?.assetId ? project.assets.find((a) => a.id === visual.assetId) : undefined
  const texts = activeClips(project.tracks, t, ['lyrics', 'subtitle'])
  const bg = activeClips(project.tracks, t, ['background'])[0]

  useEffect(() => {
    const v = videoRef.current
    if (!v || !asset || asset.kind !== 'video' || !visual) return
    const speed = visual.speed ?? 1
    v.playbackRate = speed
    v.muted = !!visual.muted || !playing
    v.volume = (visual.volume ?? 100) / 100
    const local = (t - visual.start) * speed
    if (Math.abs(v.currentTime - local) > 0.3) {
      try { v.currentTime = Math.max(0, local) } catch { /* noop */ }
    }
    if (playing && v.paused) v.play().catch(() => {})
    if (!playing && !v.paused) v.pause()
  }, [t, playing, asset, visual])

  const mediaTransform = visual
    ? `rotate(${visual.rotate ?? 0}deg) scaleX(${visual.mirror ? -1 : 1})`
    : undefined

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-stage-800"
        style={{ aspectRatio: '16 / 9', maxHeight: '100%', maxWidth: '100%', height: '100%' }}
      >
        {/* 背景 */}
        <div className="absolute inset-0" style={bg ? bgStyle(bg.label) : bgStyle(undefined)} />

        {/* メインビジュアル */}
        {asset ? (
          asset.kind === 'video' ? (
            <video ref={videoRef} src={asset.url} className="absolute inset-0 w-full h-full object-contain"
              style={{ transform: mediaTransform, opacity: clipOpacity(visual!, t) }} />
          ) : (
            <img src={asset.url} className="absolute inset-0 w-full h-full object-contain"
              style={{ transform: mediaTransform, opacity: clipOpacity(visual!, t) }} />
          )
        ) : !bg ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-xl dream-gradient opacity-80 mb-3" />
              <div className="text-stage-600 text-sm">プレビュー</div>
            </div>
          </div>
        ) : null}

        {/* エフェクト（アニメーション描画） */}
        <EffectsCanvas />

        {/* 歌詞・字幕 */}
        {texts.length > 0 && (
          <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center gap-2 px-8 pointer-events-none">
            {texts.map((c) => (
              <div key={c.id} className="font-black text-center"
                style={{
                  fontSize: `${(c.fontSize ?? 40) * 0.7}px`,
                  color: c.fontColor ?? '#fff',
                  opacity: clipOpacity(c, t),
                  textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px #000',
                  WebkitTextStroke: '1px rgba(0,0,0,0.5)',
                }}>
                {c.text ?? c.label}
              </div>
            ))}
          </div>
        )}

        {/* セーフエリア枠 */}
        <div className="absolute inset-[5%] border border-white/10 rounded pointer-events-none" />
      </div>

      <div className="flex items-center gap-4 text-xs text-stage-600">
        <span>{RES_LABEL[project.resolution]}</span>
        <span>{project.fps}fps</span>
        <span className="tabular-nums">{formatTime(t)} / {formatTime(project.durationSec)}</span>
      </div>
    </div>
  )
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const cs = Math.floor((s % 1) * 100)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { EFFECTS } from '@/lib/catalog'
import type { Clip } from '@/types'

const RES_LABEL: Record<string, string> = { '720p': '1280×720', '1080p': '1920×1080', '2k': '2560×1440', '4k': '3840×2160' }

function activeClips(tracks: ReturnType<typeof useStore.getState>['project']['tracks'], t: number, types: string[]) {
  const out: Clip[] = []
  for (const tr of tracks) {
    if (tr.hidden || !types.includes(tr.type)) continue
    for (const c of tr.clips) {
      if (t >= c.start && t < c.start + c.duration) out.push(c)
    }
  }
  return out
}

export default function Preview() {
  const project = useStore((s) => s.project)
  const t = useStore((s) => s.currentTime)
  const playing = useStore((s) => s.playing)
  const videoRef = useRef<HTMLVideoElement>(null)

  const visual = useMemo(() => {
    const clips = activeClips(project.tracks, t, ['video', 'image'])
    // 最後（上のトラック優先ではなく最後に追加＝前面）
    return clips[clips.length - 1]
  }, [project.tracks, t])

  const asset = visual?.assetId ? project.assets.find((a) => a.id === visual.assetId) : undefined
  const texts = activeClips(project.tracks, t, ['lyrics', 'subtitle'])
  const effects = activeClips(project.tracks, t, ['effect'])
  const bg = activeClips(project.tracks, t, ['background'])[0]

  // 動画クリップの再生同期
  useEffect(() => {
    const v = videoRef.current
    if (!v || !asset || asset.kind !== 'video' || !visual) return
    const local = t - visual.start
    if (Math.abs(v.currentTime - local) > 0.3) {
      try { v.currentTime = Math.max(0, local) } catch { /* noop */ }
    }
    if (playing && v.paused) v.play().catch(() => {})
    if (!playing && !v.paused) v.pause()
  }, [t, playing, asset, visual])

  const aspect = 16 / 9

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-stage-800"
        style={{ aspectRatio: String(aspect), maxHeight: '100%', maxWidth: '100%', width: 'auto', height: '100%' }}
      >
        {/* 背景 */}
        <div
          className="absolute inset-0"
          style={{
            background: bg
              ? 'linear-gradient(135deg,#1e1b4b,#4c1d95,#831843)'
              : 'radial-gradient(circle at 50% 30%, #14121f, #000)',
          }}
        />

        {/* メインビジュアル */}
        {asset ? (
          asset.kind === 'video' ? (
            <video ref={videoRef} src={asset.url} className="absolute inset-0 w-full h-full object-contain" muted={!playing} />
          ) : (
            <img src={asset.url} className="absolute inset-0 w-full h-full object-contain" />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-xl dream-gradient opacity-80 mb-3" />
              <div className="text-stage-600 text-sm">プレビュー</div>
            </div>
          </div>
        )}

        {/* エフェクト（記号オーバーレイ） */}
        {effects.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {effects.map((e) => {
              const def = EFFECTS.find((x) => x.id === e.effectId) ?? EFFECTS[0]
              return (
                <div key={e.id} className="absolute inset-0 flex items-center justify-center opacity-70">
                  <span className="text-6xl animate-pulse" style={{ filter: `drop-shadow(0 0 12px ${def.color})` }}>
                    {def.icon}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 歌詞・字幕 */}
        {texts.length > 0 && (
          <div className="absolute inset-x-0 bottom-[10%] flex flex-col items-center gap-2 px-8 pointer-events-none">
            {texts.map((c) => (
              <div
                key={c.id}
                className="font-black text-center"
                style={{
                  fontSize: `${(c.fontSize ?? 40) * 0.7}px`,
                  color: c.fontColor ?? '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px #000',
                  WebkitTextStroke: '1px rgba(0,0,0,0.5)',
                }}
              >
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

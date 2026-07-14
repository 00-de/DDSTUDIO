import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { TRACK_COLORS } from '@/lib/catalog'
import type { Clip } from '@/types'

const HEADER_W = 150
const LANE_H = 46
const RULER_H = 24

export default function Timeline() {
  const project = useStore((s) => s.project)
  const zoom = useStore((s) => s.zoom)
  const currentTime = useStore((s) => s.currentTime)
  const selectedClipId = useStore((s) => s.selectedClipId)
  const { setCurrentTime, selectClip, moveClip, setZoom, updateTrack } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; grabDx: number } | null>(null)
  const [, force] = useState(0)

  const totalWidth = Math.max(project.durationSec * zoom, 400)

  // clientX → 時間（秒）。ヘッダ幅とスクロール量を考慮
  const timeFromClientX = (clientX: number) => {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left - HEADER_W + el.scrollLeft
    return Math.max(0, x / zoom)
  }

  const seek = (e: React.MouseEvent) => setCurrentTime(timeFromClientX(e.clientX))

  // Ctrl+ホイールでズーム（カーソル位置を基準に）
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    const el = scrollRef.current
    if (!el) return
    const before = timeFromClientX(e.clientX)
    const nz = Math.min(80, Math.max(3, zoom * (e.deltaY < 0 ? 1.15 : 0.87)))
    setZoom(nz)
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect()
      el.scrollLeft = before * nz - (e.clientX - rect.left - HEADER_W)
    })
  }

  // クリップドラッグ
  const onClipPointerDown = (e: React.PointerEvent, clip: Clip) => {
    e.stopPropagation()
    selectClip(clip.id)
    dragRef.current = { id: clip.id, grabDx: timeFromClientX(e.clientX) - clip.start }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onClipPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    moveClip(dragRef.current.id, timeFromClientX(e.clientX) - dragRef.current.grabDx)
    force((n) => n + 1)
  }
  const onClipPointerUp = () => { dragRef.current = null }

  const step = zoom < 6 ? 15 : zoom < 10 ? 10 : zoom < 24 ? 5 : 1
  const ticks: number[] = []
  for (let s = 0; s <= project.durationSec; s += step) ticks.push(s)

  return (
    <div className="h-full flex flex-col select-none">
      {/* タイトルバー */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-stage-800 bg-stage-850 shrink-0">
        <span className="panel-title !p-0">タイムライン</span>
        <div className="flex items-center gap-2 text-xs text-stage-600">
          <span className="tabular-nums">{project.durationSec}s / {zoom.toFixed(0)}px/s</span>
          <button className="tool-btn w-6 h-6 rounded" title="縮小" onClick={() => setZoom(zoom - 4)}>−</button>
          <button className="tool-btn w-6 h-6 rounded" title="拡大" onClick={() => setZoom(zoom + 4)}>＋</button>
        </div>
      </div>

      {/* 単一スクロール領域（縦横） / 見出し・目盛りは sticky で固定 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto relative" onWheel={onWheel}>
        <div className="relative" style={{ width: HEADER_W + totalWidth }}>
          {/* ルーラー行（上部固定） */}
          <div className="sticky top-0 z-30 flex" style={{ height: RULER_H }}>
            <div className="sticky left-0 z-40 bg-stage-850 border-b border-r border-stage-800 shrink-0" style={{ width: HEADER_W }} />
            <div className="relative bg-stage-850 border-b border-stage-800 cursor-pointer" style={{ width: totalWidth }} onClick={seek}>
              {ticks.map((s) => (
                <div key={s} className="absolute top-0 h-full flex items-start" style={{ left: s * zoom }}>
                  <div className="w-px h-2 bg-stage-700" />
                  <span className="text-[9px] text-stage-600 ml-1 mt-0.5 tabular-nums">{tickLabel(s)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* トラック行 */}
          {project.tracks.map((tr, idx) => (
            <div key={tr.id} className="flex" style={{ height: LANE_H }}>
              {/* 見出し（左固定・VEGAS 風） */}
              <div className="sticky left-0 z-20 bg-stage-900 border-b border-r border-stage-800/60 flex shrink-0" style={{ width: HEADER_W }}>
                <div className="w-1 shrink-0" style={{ background: TRACK_COLORS[tr.type] }} />
                <div className="flex-1 min-w-0 flex flex-col justify-center px-1.5 gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-stage-600 w-3 text-center shrink-0">{idx + 1}</span>
                    <span className="text-[11px] text-slate-700 truncate flex-1">{tr.name}</span>
                    <HdrBtn on={tr.muted} label="M" title="ミュート" onClick={() => updateTrack(tr.id, { muted: !tr.muted })} />
                    <HdrBtn on={!!tr.solo} label="S" title="ソロ" onClick={() => updateTrack(tr.id, { solo: !tr.solo })} accent />
                    <HdrBtn on={tr.hidden} label="👁" title="表示/非表示" onClick={() => updateTrack(tr.id, { hidden: !tr.hidden })} />
                  </div>
                  <input
                    type="range" min="0" max="100" value={tr.volume ?? 100}
                    onChange={(e) => updateTrack(tr.id, { volume: Number(e.target.value) })}
                    className="w-full h-1 accent-dream-violet"
                    title="音量"
                  />
                </div>
              </div>
              {/* レーン */}
              <div className="relative border-b border-stage-800/60" style={{ width: totalWidth }}
                onPointerMove={onClipPointerMove} onPointerUp={onClipPointerUp}
                onClick={(e) => { if (e.target === e.currentTarget) seek(e) }}>
                {tr.clips.map((c) => {
                  const selected = c.id === selectedClipId
                  return (
                    <div key={c.id} onPointerDown={(e) => onClipPointerDown(e, c)}
                      className={'absolute top-1 bottom-1 rounded-md px-2 flex items-center overflow-hidden cursor-grab active:cursor-grabbing ' + (selected ? 'ring-2 ring-dream-violet z-10' : 'ring-1 ring-black/20')}
                      style={{ left: c.start * zoom, width: Math.max(c.duration * zoom, 8), background: `linear-gradient(180deg, ${c.color}dd, ${c.color}99)` }}
                      title={c.label}>
                      <span className="text-[11px] font-medium text-white truncate drop-shadow">{c.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* 再生ヘッド */}
          <div className="absolute top-0 bottom-0 w-px bg-dream-pink z-10 pointer-events-none" style={{ left: HEADER_W + currentTime * zoom }}>
            <div className="w-3 h-3 -ml-1.5 rotate-45 bg-dream-pink" />
          </div>
        </div>
      </div>
    </div>
  )
}

function tickLabel(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

function HdrBtn({ on, label, title, onClick, accent }: { on: boolean; label: string; title: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        'w-4 h-4 rounded-sm text-[8px] font-bold flex items-center justify-center shrink-0 transition-colors ' +
        (on
          ? (accent ? 'bg-dream-cyan text-black' : 'bg-dream-pink text-white')
          : 'bg-stage-800 text-stage-600 hover:text-dream-violet')
      }
    >
      {label}
    </button>
  )
}

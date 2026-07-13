import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { TRACK_COLORS } from '@/lib/catalog'
import type { Clip } from '@/types'

const HEADER_W = 96
const LANE_H = 40

export default function Timeline() {
  const project = useStore((s) => s.project)
  const zoom = useStore((s) => s.zoom)
  const currentTime = useStore((s) => s.currentTime)
  const selectedClipId = useStore((s) => s.selectedClipId)
  const { setCurrentTime, selectClip, moveClip } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; grabDx: number } | null>(null)
  const [, force] = useState(0)

  const totalWidth = Math.max(project.durationSec * zoom, 600)

  const timeFromClientX = (clientX: number) => {
    const el = scrollRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left + el.scrollLeft
    return Math.max(0, x / zoom)
  }

  const onRulerClick = (e: React.MouseEvent) => {
    setCurrentTime(timeFromClientX(e.clientX))
  }

  // クリップドラッグ
  const onClipPointerDown = (e: React.PointerEvent, clip: Clip) => {
    e.stopPropagation()
    selectClip(clip.id)
    const startX = timeFromClientX(e.clientX)
    dragRef.current = { id: clip.id, grabDx: startX - clip.start }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onClipPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const t = timeFromClientX(e.clientX)
    moveClip(dragRef.current.id, t - dragRef.current.grabDx)
    force((n) => n + 1)
  }
  const onClipPointerUp = () => {
    dragRef.current = null
  }

  // ルーラー目盛り
  const step = zoom < 8 ? 10 : zoom < 20 ? 5 : 1
  const ticks: number[] = []
  for (let s = 0; s <= project.durationSec; s += step) ticks.push(s)

  return (
    <div className="h-full flex flex-col select-none">
      {/* タイムラインヘッダ */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-stage-800 bg-stage-850">
        <span className="panel-title !p-0">タイムライン</span>
        <span className="text-xs text-stage-600 tabular-nums">{project.durationSec}s / {zoom}px/s</span>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* トラックヘッダ列 */}
        <div className="shrink-0 bg-stage-900 border-r border-stage-800" style={{ width: HEADER_W }}>
          <div style={{ height: 22 }} className="border-b border-stage-800" />
          {project.tracks.map((tr) => (
            <div
              key={tr.id}
              style={{ height: LANE_H }}
              className="flex items-center gap-1.5 px-2 border-b border-stage-800/60"
            >
              <div className="w-1.5 h-6 rounded-full shrink-0" style={{ background: TRACK_COLORS[tr.type] }} />
              <span className="text-[11px] text-stage-600 truncate">{tr.name}</span>
            </div>
          ))}
        </div>

        {/* スクロール可能なレーン領域 */}
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden relative">
          <div style={{ width: totalWidth }} className="relative">
            {/* ルーラー */}
            <div
              className="h-[22px] border-b border-stage-800 bg-stage-850 relative cursor-pointer"
              onClick={onRulerClick}
            >
              {ticks.map((s) => (
                <div key={s} className="absolute top-0 h-full flex items-start" style={{ left: s * zoom }}>
                  <div className="w-px h-2 bg-stage-700" />
                  <span className="text-[9px] text-stage-600 ml-1 mt-0.5 tabular-nums">{s}s</span>
                </div>
              ))}
            </div>

            {/* レーン */}
            {project.tracks.map((tr) => (
              <div
                key={tr.id}
                style={{ height: LANE_H }}
                className="relative border-b border-stage-800/60"
                onPointerMove={onClipPointerMove}
                onPointerUp={onClipPointerUp}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setCurrentTime(timeFromClientX(e.clientX))
                }}
              >
                {tr.clips.map((c) => {
                  const selected = c.id === selectedClipId
                  return (
                    <div
                      key={c.id}
                      onPointerDown={(e) => onClipPointerDown(e, c)}
                      className={
                        'absolute top-1 bottom-1 rounded-md px-2 flex items-center overflow-hidden cursor-grab active:cursor-grabbing ' +
                        (selected ? 'ring-2 ring-white z-10' : 'ring-1 ring-black/30')
                      }
                      style={{
                        left: c.start * zoom,
                        width: Math.max(c.duration * zoom, 10),
                        background: `linear-gradient(180deg, ${c.color}dd, ${c.color}99)`,
                      }}
                      title={c.label}
                    >
                      <span className="text-[11px] font-medium text-white truncate drop-shadow">{c.label}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* 再生ヘッド */}
            <div
              className="absolute top-0 bottom-0 w-px bg-dream-pink z-20 pointer-events-none"
              style={{ left: currentTime * zoom }}
            >
              <div className="w-3 h-3 -ml-1.5 rotate-45 bg-dream-pink" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

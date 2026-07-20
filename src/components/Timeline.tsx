import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { TRACK_COLORS, TRACK_DEFS } from '@/lib/catalog'
import { getStrip } from '@/lib/thumbs'
import Waveform from '@/components/Waveform'
import type { Clip, Track, TrackType } from '@/types'

const HEADER_W = 164
const LANE_H = 46
const RULER_H = 24

export default function Timeline() {
  const project = useStore((s) => s.project)
  const zoom = useStore((s) => s.zoom)
  const currentTime = useStore((s) => s.currentTime)
  const selectedClipId = useStore((s) => s.selectedClipId)
  const peers = useStore((s) => s.peers)
  const { setCurrentTime, selectClip, moveClip, setZoom, updateTrack, addTrack, removeTrack, moveTrack, moveTrackTo, addClipFromAssetAt } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; grabDx: number } | null>(null)
  const resizeRef = useRef<{ id: string; startY: number; startH: number } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [, force] = useState(0)
  const [dragTrack, setDragTrack] = useState<string | null>(null)
  const [dropTrack, setDropTrack] = useState<string | null>(null)

  const totalWidth = Math.max(project.durationSec * zoom, 400)

  // トラック高さリサイズ
  const onResizeDown = (e: React.PointerEvent, id: string, h: number) => {
    e.stopPropagation()
    resizeRef.current = { id, startY: e.clientY, startH: h }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return
    const dy = e.clientY - resizeRef.current.startY
    updateTrack(resizeRef.current.id, { height: Math.min(200, Math.max(32, resizeRef.current.startH + dy)) })
    force((n) => n + 1)
  }
  const onResizeUp = () => { resizeRef.current = null }

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
      <div className="h-8 flex items-center justify-between px-3 border-b border-stage-800 bg-stage-850 shrink-0 relative">
        <div className="flex items-center gap-2">
          <span className="panel-title !p-0">タイムライン</span>
          <div className="relative">
            <button
              onClick={() => setAddOpen((v) => !v)}
              className="text-[11px] px-2 py-0.5 rounded-md dream-gradient text-white font-semibold hover:brightness-110"
            >
              ＋ トラック追加
            </button>
            {addOpen && (
              <div className="absolute top-7 left-0 z-50 bg-white border border-stage-700 rounded-md shadow-xl py-1 w-32" onMouseLeave={() => setAddOpen(false)}>
                {TRACK_DEFS.map((d) => (
                  <button
                    key={d.type}
                    onClick={() => { addTrack(d.type as TrackType); setAddOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-dream-violet/10 text-left text-sm"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: TRACK_COLORS[d.type] }} />
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
          {project.tracks.map((tr, idx) => {
            const h = tr.height ?? LANE_H
            return (
            <div key={tr.id} className="flex" style={{ height: h }}>
              {/* 見出し（左固定・VEGAS 風） */}
              <div
                className={'sticky left-0 z-20 bg-stage-900 border-r border-stage-800/60 flex shrink-0 relative group ' + (dropTrack === tr.id ? 'border-t-2 border-t-dream-violet' : 'border-b')}
                style={{ width: HEADER_W }}
                onDragOver={(e) => { if (dragTrack && dragTrack !== tr.id) { e.preventDefault(); setDropTrack(tr.id) } }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragTrack) { const to = project.tracks.findIndex((x) => x.id === tr.id); moveTrackTo(dragTrack, to) }
                  setDragTrack(null); setDropTrack(null)
                }}
              >
                <div className="w-1 shrink-0" style={{ background: TRACK_COLORS[tr.type] }} />
                {/* 並び替え + 番号（ドラッグでも並び替え可） */}
                <div
                  className="flex flex-col items-center justify-center px-0.5 shrink-0 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => { setDragTrack(tr.id); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => { setDragTrack(null); setDropTrack(null) }}
                  title="ドラッグで並び替え"
                >
                  <button title="上へ" onClick={() => moveTrack(tr.id, 'up')} disabled={idx === 0}
                    className="text-[8px] leading-none text-stage-600 hover:text-dream-violet disabled:opacity-20">▲</button>
                  <span className="text-[10px] font-bold text-slate-500 leading-tight">{idx + 1}</span>
                  <button title="下へ" onClick={() => moveTrack(tr.id, 'down')} disabled={idx === project.tracks.length - 1}
                    className="text-[8px] leading-none text-stage-600 hover:text-dream-violet disabled:opacity-20">▼</button>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center px-1 gap-1">
                  <div className="flex items-center gap-1">
                    <TrackName track={tr} onRename={(name) => updateTrack(tr.id, { name })} />
                    <HdrBtn on={tr.muted} label="M" title="ミュート" onClick={() => updateTrack(tr.id, { muted: !tr.muted })} />
                    <HdrBtn on={!!tr.solo} label="S" title="ソロ" onClick={() => updateTrack(tr.id, { solo: !tr.solo })} accent />
                    <HdrBtn on={tr.hidden} label="👁" title="表示/非表示" onClick={() => updateTrack(tr.id, { hidden: !tr.hidden })} />
                    <button
                      title="トラック削除"
                      onClick={() => { if (confirm(`「${tr.name}」トラックを削除しますか？`)) removeTrack(tr.id) }}
                      className="w-4 h-4 rounded-sm text-[10px] text-stage-600 hover:text-white hover:bg-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >×</button>
                  </div>
                  <input
                    type="range" min="0" max="100" value={tr.volume ?? 100}
                    onChange={(e) => updateTrack(tr.id, { volume: Number(e.target.value) })}
                    className="w-full h-1 accent-dream-violet"
                    title="音量"
                  />
                </div>
                {/* 高さリサイズハンドル */}
                <div
                  onPointerDown={(e) => onResizeDown(e, tr.id, h)}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeUp}
                  className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-dream-violet/40"
                  title="ドラッグで高さ変更"
                />
              </div>
              {/* レーン */}
              <div className="relative border-b border-stage-800/60" style={{ width: totalWidth }}
                onPointerMove={onClipPointerMove} onPointerUp={onClipPointerUp}
                onDragOver={(e) => { if (e.dataTransfer.types.includes('dds/asset')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData('dds/asset')
                  if (!id) return
                  e.preventDefault()
                  const r = e.currentTarget.getBoundingClientRect()
                  const start = Math.max(0, (e.clientX - r.left) / zoom)
                  addClipFromAssetAt(id, tr.id, start)
                }}
                onClick={(e) => { if (e.target === e.currentTarget) seek(e) }}>
                {tr.clips.map((c) => (
                  <ClipView key={c.id} clip={c} zoom={zoom} selected={c.id === selectedClipId} laneH={h}
                    asset={c.assetId ? project.assets.find((a) => a.id === c.assetId) : undefined}
                    onPointerDown={(e) => onClipPointerDown(e, c)} />
                ))}
              </div>
            </div>
            )
          })}

          {/* 他の参加者の再生ヘッド */}
          {peers.map((p) => (
            <div key={p.id} className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
              style={{ left: HEADER_W + p.currentTime * zoom, background: p.color, opacity: 0.75 }}>
              <div className="absolute top-0 left-0 px-1 rounded-sm text-[8px] font-bold text-white whitespace-nowrap"
                style={{ background: p.color }}>
                {p.name}
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

function ClipView({ clip, zoom, selected, asset, laneH, onPointerDown }: {
  clip: Clip; zoom: number; selected: boolean; laneH: number
  asset?: { id: string; url: string; path: string; kind: string; name: string }
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const width = Math.max(clip.duration * zoom, 8)
  const isVisual = asset && (asset.kind === 'video' || asset.kind === 'image')
  const isAudio = asset && asset.kind === 'audio'
  const hasSound = asset && (asset.kind === 'video' || asset.kind === 'audio')
  const innerH = Math.max(8, laneH - 8)
  // クリップ幅に応じて必要なフレーム数（1枚あたり約72px）
  const frameCount = isVisual ? Math.max(1, Math.min(40, Math.ceil(width / 72))) : 0

  const [frames, setFrames] = useState<string[] | null>(
    () => (isVisual && asset ? getStrip(asset.id, asset.url, asset.kind, frameCount) : null)
  )

  useEffect(() => {
    if (!isVisual || !asset) return
    const got = getStrip(asset.id, asset.url, asset.kind, frameCount)
    if (got) { setFrames(got); return }
    setFrames(null)
    const onReady = (e: Event) => {
      const id = (e as CustomEvent).detail?.assetId
      if (id === asset.id) { const g = getStrip(asset.id, asset.url, asset.kind, frameCount); if (g) setFrames(g) }
    }
    window.addEventListener('dds-thumb-ready', onReady)
    return () => window.removeEventListener('dds-thumb-ready', onReady)
  }, [asset?.id, frameCount, isVisual])

  return (
    <div onPointerDown={onPointerDown}
      className={'absolute top-1 bottom-1 rounded-md overflow-hidden cursor-grab active:cursor-grabbing ' + (selected ? 'ring-2 ring-dream-violet z-10' : 'ring-1 ring-black/20')}
      style={{ left: clip.start * zoom, width, background: `linear-gradient(180deg, ${clip.color}dd, ${clip.color}99)` }}
      title={clip.label}>
      {/* フィルムストリップ（複数フレームを横に並べる） */}
      {isVisual && frames && frames.length > 0 && (
        <div className="absolute inset-0 flex">
          {Array.from({ length: frameCount }).map((_, i) => (
            <div key={i} className="h-full bg-center bg-cover shrink-0"
              style={{ width: `${100 / frameCount}%`, backgroundImage: `url(${frames[Math.min(i, frames.length - 1)]})` }} />
          ))}
        </div>
      )}
      {isVisual && frames && frames.length > 0 && <div className="absolute inset-0 bg-black/5" />}

      {/* 音声波形 */}
      {hasSound && asset && (
        <Waveform assetId={asset.id} src={asset.path || asset.url} kind={asset.kind}
          width={width} height={isAudio ? innerH : Math.max(10, innerH * 0.42)}
          color={isAudio ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'} />
      )}

      <div className="absolute inset-x-0 top-0 px-1.5 py-0.5 bg-black/40">
        <span className="text-[10px] font-medium text-white truncate block drop-shadow">{clip.label}</span>
      </div>
      {/* キーフレームマーカー */}
      {clip.keyframes && clip.keyframes.map((k) => (
        <div key={k.id} className="absolute bottom-0.5 w-2 h-2 bg-white border border-dream-violet rotate-45 -ml-1"
          style={{ left: (k.time / Math.max(0.001, clip.duration)) * width }} title={`キーフレーム ${k.time.toFixed(2)}s`} />
      ))}
    </div>
  )
}

function TrackName({ track, onRename }: { track: Track; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(track.name)
  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { onRename(val.trim() || track.name); setEditing(false) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onRename(val.trim() || track.name); setEditing(false) } }}
        className="flex-1 min-w-0 text-[11px] bg-white border border-dream-violet rounded px-1 outline-none text-slate-800"
      />
    )
  }
  return (
    <span
      className="text-[11px] text-slate-700 truncate flex-1 cursor-text"
      title="ダブルクリックで名前を変更"
      onDoubleClick={() => { setVal(track.name); setEditing(true) }}
    >
      {track.name}
    </span>
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

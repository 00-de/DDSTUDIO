import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import type { Clip } from '@/types'
import EffectsCanvas from '@/components/EffectsCanvas'
import TransitionOverlay, { cameraStyle } from '@/components/TransitionOverlay'
import { resolveClip } from '@/lib/keyframes'

// 背景ラベル → CSS
export function bgStyle(label?: string): React.CSSProperties {
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

function clipOpacity(c: Clip, t: number): number {
  let op = (c.opacity ?? 100) / 100
  const local = t - c.start
  if (c.fadeIn && local < c.fadeIn) op *= Math.max(0, local / c.fadeIn)
  if (c.fadeOut && c.duration - local < c.fadeOut) op *= Math.max(0, (c.duration - local) / c.fadeOut)
  return op
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

export default function Preview() {
  const project = useStore((s) => s.project)
  const t = useStore((s) => s.currentTime)
  const playing = useStore((s) => s.playing)
  const selectedClipId = useStore((s) => s.selectedClipId)
  const { updateClip, selectClip } = useStore()
  const stageRef = useRef<HTMLDivElement>(null)

  // すべての映像レイヤー（重なり順 layer → トラック順）
  const visuals = useMemo(() => {
    const list = activeClips(project.tracks, t, ['video', 'image'])
    return list
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (a.c.layer ?? 0) - (b.c.layer ?? 0) || a.i - b.i)
      .map((o) => o.c)
  }, [project.tracks, t])

  const texts = activeClips(project.tracks, t, ['lyrics', 'subtitle'])
  const bg = activeClips(project.tracks, t, ['background'])[0]
  const transitions = activeClips(project.tracks, t, ['effect']).filter((c) => c.transition)
  const cameras = activeClips(project.tracks, t, ['camera'])
  const cameraClip = cameras[cameras.length - 1]

  const getRect = () => stageRef.current?.getBoundingClientRect()

  // Ctrl+ホイールで選択クリップを拡大縮小
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey || !selectedClipId) return
    e.preventDefault()
    const c = findClip(project.tracks, selectedClipId)
    if (!c) return
    const next = clamp((c.scale ?? 1) * (e.deltaY < 0 ? 1.08 : 0.93), 0.1, 4)
    updateClip(c.id, { scale: next })
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <div
        ref={stageRef}
        onWheel={onWheel}
        onPointerDown={(e) => { if (e.target === e.currentTarget) selectClip(undefined) }}
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-stage-800"
        style={{ aspectRatio: '16 / 9', maxHeight: '100%', maxWidth: '100%', height: '100%' }}
      >
        {/* カメラ演出の対象（背景＋映像レイヤー） */}
        <div className="absolute inset-0" style={{ ...cameraStyle(cameraClip, t), transformOrigin: '50% 50%', perspective: '1200px' }}>
          {/* 背景 */}
          <div className="absolute inset-0" style={bg ? bgStyle(bg.label) : bgStyle(undefined)} />

          {/* 映像レイヤー（複数・重なり順・3D・キーフレーム対応） */}
          {visuals.map((raw) => {
            const c = resolveClip(raw, t)
            const a = c.assetId ? project.assets.find((x) => x.id === c.assetId) : undefined
            if (!a) return null
            return (
              <Movable key={c.id} clip={c} t={t} getRect={getRect} selected={c.id === selectedClipId} fill onSelect={() => selectClip(c.id)}>
                <LayerMedia asset={a} clip={c} t={t} playing={playing} />
              </Movable>
            )
          })}

          {visuals.length === 0 && !bg && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-xl dream-gradient opacity-80 mb-3" />
                <div className="text-white/40 text-sm">プレビュー</div>
              </div>
            </div>
          )}
        </div>

        {/* 映画風レターボックス */}
        {cameraClip?.camera === '映画風' && (
          <>
            <div className="absolute top-0 inset-x-0 h-[12%] bg-black pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-[12%] bg-black pointer-events-none" />
          </>
        )}

        {/* エフェクト */}
        <EffectsCanvas />

        {/* テロップ・歌詞（移動・拡大・その場編集・キーフレーム対応） */}
        {texts.map((raw) => {
          const c = resolveClip(raw, t)
          return (
            <Movable key={c.id} clip={c} t={t} getRect={getRect} selected={c.id === selectedClipId} text onSelect={() => selectClip(c.id)}>
              <TelopText clip={c} />
            </Movable>
          )
        })}

        {/* トランジション（最前面） */}
        <TransitionOverlay clips={transitions} t={t} />

        {/* セーフエリア枠 */}
        <div className="absolute inset-[5%] border border-white/10 rounded pointer-events-none" />
      </div>
    </div>
  )
}

/* ===== 移動・拡大ラッパ ===== */
function Movable({
  clip, t, getRect, selected, onSelect, fill, text, children,
}: {
  clip: Clip; t: number; getRect: () => DOMRect | undefined; selected: boolean
  onSelect: () => void; fill?: boolean; text?: boolean; children: React.ReactNode
}) {
  const updateClip = useStore((s) => s.updateClip)
  const drag = useRef<{ mode: 'move' | 'scale'; grabX: number; grabY: number; startScale: number; startDist: number } | null>(null)

  const x = clip.x ?? 0, y = clip.y ?? 0, scale = clip.scale ?? 1
  const rot = clip.rotate ?? 0, mir = clip.mirror ? -1 : 1
  const rx = clip.rotateX ?? 0, ry = clip.rotateY ?? 0
  const op = clipOpacity(clip, t)

  const pctFromEvent = (clientX: number, clientY: number) => {
    const r = getRect()!
    return { px: ((clientX - r.left) / r.width - 0.5) * 100, py: ((clientY - r.top) / r.height - 0.5) * 100 }
  }

  const onBodyDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    onSelect()
    const { px, py } = pctFromEvent(e.clientX, e.clientY)
    drag.current = { mode: 'move', grabX: px - x, grabY: py - y, startScale: scale, startDist: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onHandleDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    onSelect()
    const r = getRect()!
    const cx = r.left + r.width * (0.5 + x / 100)
    const cy = r.top + r.height * (0.5 + y / 100)
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1
    drag.current = { mode: 'scale', grabX: 0, grabY: 0, startScale: scale, startDist: dist }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    if (drag.current.mode === 'move') {
      const { px, py } = pctFromEvent(e.clientX, e.clientY)
      updateClip(clip.id, { x: clamp(px - drag.current.grabX, -60, 60), y: clamp(py - drag.current.grabY, -60, 60) })
    } else {
      const r = getRect()!
      const cx = r.left + r.width * (0.5 + x / 100)
      const cy = r.top + r.height * (0.5 + y / 100)
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
      updateClip(clip.id, { scale: clamp(drag.current.startScale * (dist / drag.current.startDist), 0.1, 4) })
    }
  }
  const onUp = () => { drag.current = null }

  const hasCell = (clip.cellW ?? 0) > 0 && (clip.cellH ?? 0) > 0
  const boxSize: React.CSSProperties = hasCell
    ? { width: `${(clip.cellW ?? 1) * 100}%`, height: `${(clip.cellH ?? 1) * 100}%` }
    : {}

  return (
    <div
      className={'absolute ' + (fill && !hasCell ? 'w-full h-full ' : '') + (selected ? 'cursor-move' : 'cursor-pointer')}
      style={{
        left: `${50 + x}%`, top: `${50 + y}%`,
        transform: `translate(-50%,-50%) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale}) rotate(${rot}deg) scaleX(${mir})`,
        opacity: op,
        ...boxSize,
        ...(fill || hasCell ? {} : { whiteSpace: 'nowrap' as const }),
      }}
      onPointerDown={onBodyDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {children}
      {(clip.borderWidth || clip.borderRadius || clip.frameShadow) && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: clip.borderWidth ? `${clip.borderWidth}px solid ${clip.borderColor ?? '#ffffff'}` : undefined,
          borderRadius: clip.borderRadius ? `${clip.borderRadius}px` : undefined,
          boxShadow: clip.frameShadow ? '0 8px 30px rgba(0,0,0,0.55)' : undefined,
        }} />
      )}
      {selected && (
        <>
          <div className="absolute inset-0 ring-2 ring-dream-cyan pointer-events-none rounded-sm" />
          {/* 右下リサイズハンドル（拡大縮小の逆スケールで見た目一定） */}
          <div
            onPointerDown={onHandleDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            className="absolute -right-2 -bottom-2 bg-dream-cyan rounded-full cursor-nwse-resize"
            style={{ width: 14 / scale, height: 14 / scale, transform: `scaleX(${mir})` }}
            title="ドラッグで拡大縮小"
          />
        </>
      )}
    </div>
  )
}

/* ===== テロップ表示（ダブルクリックで編集） ===== */
function TelopText({ clip }: { clip: Clip }) {
  const updateClip = useStore((s) => s.updateClip)
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const style: React.CSSProperties = {
    fontSize: `${(clip.fontSize ?? 48) * 0.6}px`,
    color: clip.fontColor ?? '#fff',
    fontWeight: 900,
    textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px #000',
    WebkitTextStroke: '1px rgba(0,0,0,0.5)',
    lineHeight: 1.2,
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={clip.text ?? ''}
        onChange={(e) => updateClip(clip.id, { text: e.target.value, label: e.target.value || 'テロップ' })}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false) }}
        onPointerDown={(e) => e.stopPropagation()}
        className="bg-black/40 outline-none text-center px-1"
        style={style}
      />
    )
  }
  return (
    <div style={style} onDoubleClick={() => setEditing(true)} className="text-center px-1 select-none">
      {clip.text || clip.label}
    </div>
  )
}

function findClip(tracks: ReturnType<typeof useStore.getState>['project']['tracks'], id?: string): Clip | undefined {
  if (!id) return undefined
  for (const tr of tracks) { const c = tr.clips.find((c) => c.id === id); if (c) return c }
  return undefined
}

/* ===== レイヤー映像（動画は自身で再生同期） ===== */
function LayerMedia({ asset, clip, t, playing }: { asset: { url: string; kind: string }; clip: Clip; t: number; playing: boolean }) {
  const vref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = vref.current
    if (!v) return
    const speed = clip.speed ?? 1
    v.playbackRate = speed
    v.muted = true // プレビュー音は鳴らさない（書き出し側でミックス）
    const local = (t - clip.start) * speed
    if (Math.abs(v.currentTime - local) > 0.3) { try { v.currentTime = Math.max(0, local) } catch { /* noop */ } }
    if (playing && v.paused) v.play().catch(() => {})
    if (!playing && !v.paused) v.pause()
  }, [t, playing, clip.start, clip.speed])

  const cx = clip.cropX ?? 0, cy = clip.cropY ?? 0, cw = clip.cropW ?? 100, ch = clip.cropH ?? 100
  const cropActive = cx > 0 || cy > 0 || cw < 100 || ch < 100
  const hasCell = (clip.cellW ?? 0) > 0 && (clip.cellH ?? 0) > 0
  // コラージュ/PiP セル：cover でセルを埋める
  const objectFit: React.CSSProperties['objectFit'] = hasCell ? 'cover' : cropActive ? 'fill' : 'contain'
  const cropStyle: React.CSSProperties = cropActive && !hasCell
    ? { position: 'absolute', width: `${10000 / cw}%`, height: `${10000 / ch}%`, left: `${(-100 * cx) / cw}%`, top: `${(-100 * cy) / ch}%`, objectFit: 'fill' }
    : {}
  const mediaClass = cropActive && !hasCell ? 'pointer-events-none' : 'w-full h-full pointer-events-none'
  const mediaStyle = cropActive && !hasCell ? cropStyle : { objectFit }

  if (asset.kind === 'video') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video ref={vref} src={asset.url} className={mediaClass} style={mediaStyle} />
      </div>
    )
  }
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img src={asset.url} className={mediaClass} style={mediaStyle} />
    </div>
  )
}

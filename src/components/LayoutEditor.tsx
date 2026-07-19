import { useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import type { Clip } from '@/types'
import { motion } from 'framer-motion'
import { bgStyle } from '@/components/Preview'

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

function activeAt(tracks: ReturnType<typeof useStore.getState>['project']['tracks'], t: number, types: string[]) {
  const out: Clip[] = []
  for (const tr of tracks) {
    if (tr.hidden || !types.includes(tr.type)) continue
    for (const c of tr.clips) if (t >= c.start && t < c.start + c.duration) out.push(c)
  }
  return out
}

export default function LayoutEditor() {
  const project = useStore((s) => s.project)
  const t = useStore((s) => s.currentTime)
  const selectedClipId = useStore((s) => s.selectedClipId)
  const { updateClip, selectClip, setCurrentTime } = useStore()
  const stageRef = useRef<HTMLDivElement>(null)
  const close = () => useStore.getState().openModal(null)

  const layers = useMemo(() => {
    return activeAt(project.tracks, t, ['video', 'image'])
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (a.c.layer ?? 0) - (b.c.layer ?? 0) || a.i - b.i)
      .map((o) => o.c)
  }, [project.tracks, t])

  const bg = activeAt(project.tracks, t, ['background'])[0]
  const sel = layers.find((c) => c.id === selectedClipId)

  return (
    <motion.div className="fixed inset-0 z-50 bg-stage-950 flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* ヘッダー */}
      <div className="h-12 shrink-0 bg-stage-900 border-b border-stage-800 flex items-center px-4 gap-3">
        <span className="font-bold dream-text">レイアウト編集</span>
        <span className="text-xs text-stage-600">素材をドラッグ＝移動 / 四隅・辺＝リサイズ / 外側リング＝回転</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-stage-600 tabular-nums">{layers.length} レイヤー</span>
          <button onClick={close} className="px-4 py-1.5 rounded-md dream-gradient text-white text-sm font-semibold hover:brightness-110">閉じる</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* キャンバス */}
        <div className="flex-1 min-w-0 flex items-center justify-center p-6 bg-stage-950">
          <div
            ref={stageRef}
            onPointerDown={(e) => { if (e.target === e.currentTarget) selectClip(undefined) }}
            className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-stage-800"
            style={{ aspectRatio: '16 / 9', width: '100%', maxHeight: '100%', maxWidth: `calc((100vh - 8rem) * 16 / 9)`, perspective: '1400px' }}
          >
            <div className="absolute inset-0" style={bg ? bgStyle(bg.label) : bgStyle(undefined)} />
            {layers.map((c) => {
              const a = c.assetId ? project.assets.find((x) => x.id === c.assetId) : undefined
              if (!a) return null
              return (
                <EditableLayer key={c.id} clip={c} asset={a} selected={c.id === selectedClipId}
                  stageRef={stageRef} onSelect={() => selectClip(c.id)} onChange={(p) => updateClip(c.id, p)} />
              )
            })}
            {layers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-stage-600 text-sm">
                再生ヘッドの位置に映像レイヤーがありません
              </div>
            )}
          </div>
        </div>

        {/* サイド：レイヤー一覧＋数値 */}
        <div className="w-72 shrink-0 bg-stage-900 border-l border-stage-800 flex flex-col">
          <div className="p-3 border-b border-stage-800">
            <div className="text-[11px] text-stage-600 font-semibold tracking-wider mb-2">レイヤー（上＝前面）</div>
            <div className="space-y-1">
              {[...layers].reverse().map((c) => {
                const a = c.assetId ? project.assets.find((x) => x.id === c.assetId) : undefined
                return (
                  <button key={c.id} onClick={() => selectClip(c.id)}
                    className={'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs ' + (c.id === selectedClipId ? 'bg-dream-violet/15 ring-1 ring-dream-violet' : 'hover:bg-stage-850')}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="truncate flex-1">{a?.name ?? c.label}</span>
                    <span className="text-[10px] text-stage-600">L{c.layer ?? 0}</span>
                  </button>
                )
              })}
              {layers.length === 0 && <div className="text-[11px] text-stage-600">なし</div>}
            </div>
          </div>

          {sel ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              <NumRow label="X位置" value={Math.round(sel.x ?? 0)} onChange={(v) => updateClip(sel.id, { x: v })} />
              <NumRow label="Y位置" value={Math.round(sel.y ?? 0)} onChange={(v) => updateClip(sel.id, { y: v })} />
              <NumRow label="拡大率" step={0.05} value={round(sel.scale ?? 1)} onChange={(v) => updateClip(sel.id, { scale: Math.max(0.1, v) })} />
              <NumRow label="回転(Z)" value={Math.round(sel.rotate ?? 0)} onChange={(v) => updateClip(sel.id, { rotate: v })} />
              <SliderRow label={`3D傾きX (${sel.rotateX ?? 0}°)`} min={-70} max={70} value={sel.rotateX ?? 0} onChange={(v) => updateClip(sel.id, { rotateX: v })} />
              <SliderRow label={`3D傾きY (${sel.rotateY ?? 0}°)`} min={-70} max={70} value={sel.rotateY ?? 0} onChange={(v) => updateClip(sel.id, { rotateY: v })} />
              <SliderRow label={`不透明度 (${sel.opacity ?? 100}%)`} min={0} max={100} value={sel.opacity ?? 100} onChange={(v) => updateClip(sel.id, { opacity: v })} />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stage-600">重なり</span>
                <button onClick={() => updateClip(sel.id, { layer: (sel.layer ?? 0) + 1 })} className="text-xs px-2 py-1 rounded border border-stage-700 hover:border-dream-violet">前面へ</button>
                <button onClick={() => updateClip(sel.id, { layer: (sel.layer ?? 0) - 1 })} className="text-xs px-2 py-1 rounded border border-stage-700 hover:border-dream-violet">背面へ</button>
                <button onClick={() => updateClip(sel.id, { mirror: !sel.mirror })} className={'text-xs px-2 py-1 rounded border ' + (sel.mirror ? 'dream-gradient text-white border-transparent' : 'border-stage-700 hover:border-dream-violet')}>反転</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-stage-600 text-xs p-4 text-center">
              レイヤーを選ぶと<br />ここで数値も調整できます
            </div>
          )}

          {/* 簡易シーク */}
          <div className="p-3 border-t border-stage-800">
            <input type="range" min={0} max={project.durationSec} step={0.1} value={t}
              onChange={(e) => setCurrentTime(Number(e.target.value))} className="w-full accent-dream-violet" />
            <div className="text-[10px] text-stage-600 text-center mt-1 tabular-nums">{t.toFixed(1)}s / {project.durationSec}s</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== キャンバス上の編集可能レイヤー ===== */
function EditableLayer({
  clip, asset, selected, stageRef, onSelect, onChange,
}: {
  clip: Clip; asset: { url: string; kind: string }; selected: boolean
  stageRef: React.RefObject<HTMLDivElement>; onSelect: () => void; onChange: (p: Partial<Clip>) => void
}) {
  const drag = useRef<{ mode: string; sx: number; sy: number; startX: number; startY: number; startScale: number; startRot: number; cx: number; cy: number; startAngle: number } | null>(null)

  const x = clip.x ?? 0, y = clip.y ?? 0, scale = clip.scale ?? 1
  const rot = clip.rotate ?? 0, mir = clip.mirror ? -1 : 1
  const rx = clip.rotateX ?? 0, ry = clip.rotateY ?? 0
  const op = (clip.opacity ?? 100) / 100

  const rect = () => stageRef.current?.getBoundingClientRect()
  const center = () => {
    const r = rect()!
    return { cx: r.left + r.width * (0.5 + x / 100), cy: r.top + r.height * (0.5 + y / 100) }
  }

  const startDrag = (e: React.PointerEvent, mode: string) => {
    e.stopPropagation()
    onSelect()
    const r = rect()!
    const { cx, cy } = center()
    drag.current = {
      mode, sx: e.clientX, sy: e.clientY,
      startX: x, startY: y, startScale: scale, startRot: rot,
      cx, cy, startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const r = rect()!
    if (d.mode === 'move') {
      const dx = ((e.clientX - d.sx) / r.width) * 100
      const dy = ((e.clientY - d.sy) / r.height) * 100
      onChange({ x: clamp(d.startX + dx, -80, 80), y: clamp(d.startY + dy, -80, 80) })
    } else if (d.mode === 'rotate') {
      const ang = Math.atan2(e.clientY - d.cy, e.clientX - d.cx)
      const deg = ((ang - d.startAngle) * 180) / Math.PI
      onChange({ rotate: Math.round(d.startRot + deg) })
    } else {
      // リサイズ：中心からの距離比
      const startDist = Math.hypot(d.sx - d.cx, d.sy - d.cy) || 1
      const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy)
      onChange({ scale: clamp(d.startScale * (dist / startDist), 0.1, 6) })
    }
  }
  const onUp = () => { drag.current = null }

  const hSize = 12 / scale
  const handle = (pos: string, cur: string, style: React.CSSProperties) => (
    <div onPointerDown={(e) => startDrag(e, 'resize')} onPointerMove={onMove} onPointerUp={onUp}
      className="absolute bg-white border-2 border-dream-cyan rounded-sm" title="ドラッグでリサイズ"
      style={{ width: hSize, height: hSize, cursor: cur, transform: `scaleX(${mir})`, ...style }} />
  )

  return (
    <div
      className={'absolute w-full h-full ' + (selected ? 'cursor-move' : 'cursor-pointer')}
      style={{
        left: `${50 + x}%`, top: `${50 + y}%`,
        transform: `translate(-50%,-50%) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale}) rotate(${rot}deg) scaleX(${mir})`,
        opacity: op,
      }}
      onPointerDown={(e) => startDrag(e, 'move')}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {asset.kind === 'video'
        ? <video src={asset.url} className="w-full h-full object-contain pointer-events-none" muted />
        : <img src={asset.url} className="w-full h-full object-contain pointer-events-none" />}

      {selected && (
        <>
          {/* 回転リング */}
          <div onPointerDown={(e) => startDrag(e, 'rotate')} onPointerMove={onMove} onPointerUp={onUp}
            className="absolute rounded-full border-2 border-dashed border-dream-pink/70 cursor-grab"
            style={{ inset: `${-18 / scale}px` }} title="ドラッグで回転" />
          {/* 枠 */}
          <div className="absolute inset-0 ring-2 ring-dream-cyan pointer-events-none" />
          {/* 四隅ハンドル */}
          {handle('tl', 'nwse-resize', { left: -hSize / 2, top: -hSize / 2 })}
          {handle('tr', 'nesw-resize', { right: -hSize / 2, top: -hSize / 2 })}
          {handle('bl', 'nesw-resize', { left: -hSize / 2, bottom: -hSize / 2 })}
          {handle('br', 'nwse-resize', { right: -hSize / 2, bottom: -hSize / 2 })}
          {/* 辺ハンドル */}
          {handle('t', 'ns-resize', { left: '50%', top: -hSize / 2, marginLeft: -hSize / 2 })}
          {handle('b', 'ns-resize', { left: '50%', bottom: -hSize / 2, marginLeft: -hSize / 2 })}
          {handle('l', 'ew-resize', { top: '50%', left: -hSize / 2, marginTop: -hSize / 2 })}
          {handle('r', 'ew-resize', { top: '50%', right: -hSize / 2, marginTop: -hSize / 2 })}
        </>
      )}
    </div>
  )
}

/* --- サイド小物 --- */
function NumRow({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] text-stage-600 w-16 shrink-0">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="dds-input flex-1" />
    </label>
  )
}
function SliderRow({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-stage-600 mb-1 block">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-dream-violet" />
    </label>
  )
}
function round(n: number) { return Math.round(n * 100) / 100 }

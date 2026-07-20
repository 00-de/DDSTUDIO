import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'
import { LAYOUTS, layoutById, type Cell } from '@/lib/collage'
import { getThumb } from '@/lib/thumbs'
import type { MediaAsset } from '@/types'

export default function CollageModal() {
  const close = () => useStore.getState().openModal(null)
  const project = useStore((s) => s.project)
  const createCollage = useStore((s) => s.createCollage)
  const currentTime = useStore((s) => s.currentTime)

  const mediaAssets = useMemo(
    () => project.assets.filter((a) => a.kind === 'video' || a.kind === 'image'),
    [project.assets]
  )

  const [layoutId, setLayoutId] = useState('g4')
  const [cells, setCells] = useState<Cell[]>(() => layoutById('g4')!.cells.map((c) => ({ ...c })))
  const [assign, setAssign] = useState<(string | null)[]>(() => Array(4).fill(null))
  const [selCell, setSelCell] = useState(0)
  const [duration, setDuration] = useState(8)
  const [dragAsset, setDragAsset] = useState<string | null>(null)
  const [dropCell, setDropCell] = useState<number | null>(null)

  const chooseLayout = (id: string) => {
    const l = layoutById(id)!
    setLayoutId(id)
    setCells(l.cells.map((c) => ({ ...c })))
    setAssign((prev) => {
      const next = Array(l.count).fill(null) as (string | null)[]
      for (let i = 0; i < Math.min(prev.length, l.count); i++) next[i] = prev[i]
      return next
    })
    setSelCell(0)
  }

  const setCellAsset = (i: number, assetId: string | null) => {
    setAssign((prev) => { const n = [...prev]; n[i] = assetId; return n })
  }

  // クリックした素材を、選択中の枠 → 次の空き枠 の順で入れる
  const assignToNext = (assetId: string) => {
    setAssign((prev) => {
      const n = [...prev]
      if (n[selCell] == null) { n[selCell] = assetId; advanceSel(selCell, n); return n }
      const empty = n.findIndex((v) => v == null)
      if (empty >= 0) { n[empty] = assetId; advanceSel(empty, n) } else { n[selCell] = assetId }
      return n
    })
  }
  const advanceSel = (from: number, arr: (string | null)[]) => {
    for (let i = from + 1; i < arr.length; i++) if (arr[i] == null) { setSelCell(i); return }
  }

  const place = () => {
    const items = cells
      .map((c, i) => ({ assetId: assign[i], x: c.x, y: c.y, scale: c.scale, layer: c.layer }))
      .filter((it): it is { assetId: string; x: number; y: number; scale: number; layer: number } => !!it.assetId)
    if (items.length === 0) { alert('枠に素材を入れてください（素材をクリックまたはドラッグ）。'); return }
    createCollage(items, currentTime, duration)
    close()
  }

  const adjust = (patch: Partial<Cell>) => setCells((prev) => prev.map((c, i) => (i === selCell ? { ...c, ...patch } : c)))
  const sel = cells[selCell]
  const filledCount = assign.filter(Boolean).length

  return (
    <ModalShell title="コラージュ / PiP" onClose={close} wide>
      <div className="flex gap-3" style={{ minHeight: '60vh' }}>
        {/* 左：レイアウト */}
        <div className="w-32 shrink-0 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: '66vh' }}>
          <div className="text-[10px] text-stage-600 font-semibold tracking-wider mb-1">レイアウト</div>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => chooseLayout(l.id)}
              className={'w-full text-left text-[11px] px-2 py-1.5 rounded-md border ' + (layoutId === l.id ? 'dream-gradient text-white border-transparent' : 'border-stage-700 hover:border-dream-violet')}>
              {l.name}
            </button>
          ))}
        </div>

        {/* 中央：大きいプレビュー + 素材ストリップ */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="relative bg-black rounded-lg overflow-hidden ring-1 ring-stage-800 w-full" style={{ aspectRatio: '16 / 9' }}>
            {cells.map((c, i) => {
              const asset = assign[i] ? project.assets.find((a) => a.id === assign[i]) : null
              const isDrop = dropCell === i
              return (
                <div key={i}
                  onClick={() => setSelCell(i)}
                  onDragOver={(e) => { if (dragAsset) { e.preventDefault(); setDropCell(i) } }}
                  onDragLeave={() => setDropCell((d) => (d === i ? null : d))}
                  onDrop={(e) => { e.preventDefault(); if (dragAsset) { setCellAsset(i, dragAsset); setSelCell(i) } setDropCell(null); setDragAsset(null) }}
                  className={'absolute overflow-hidden cursor-pointer transition-shadow ' +
                    (selCell === i ? 'ring-2 ring-dream-cyan z-10 ' : 'ring-1 ring-white/30 ') +
                    (isDrop ? 'ring-2 ring-dream-pink z-20' : '')}
                  style={{
                    left: `${50 + c.x - c.scale * 50}%`, top: `${50 + c.y - c.scale * 50}%`,
                    width: `${c.scale * 100}%`, height: `${c.scale * 100}%`,
                    background: asset ? undefined : 'rgba(255,255,255,0.06)',
                  }}>
                  {asset ? (
                    <CellThumb asset={asset} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/45 text-base font-bold">{i + 1}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 素材ストリップ（クリックで枠へ / ドラッグで枠へ） */}
          <div className="rounded-lg border border-stage-800 bg-stage-850 p-2">
            <div className="text-[10px] text-stage-600 mb-1.5">素材をクリックすると選択中の枠に入ります（ドラッグで好きな枠へ）</div>
            {mediaAssets.length === 0 ? (
              <div className="text-[11px] text-stage-600 py-2 text-center">素材がありません。先に「素材を読み込む」から追加してください。</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mediaAssets.map((a) => (
                  <button key={a.id}
                    draggable
                    onDragStart={() => setDragAsset(a.id)}
                    onDragEnd={() => { setDragAsset(null); setDropCell(null) }}
                    onClick={() => assignToNext(a.id)}
                    title={a.name}
                    className="shrink-0 w-24 rounded-md overflow-hidden border border-stage-700 hover:border-dream-violet cursor-grab active:cursor-grabbing">
                    <div className="w-full aspect-video bg-stage-950"><CellThumb asset={a} /></div>
                    <div className="text-[9px] text-stage-500 truncate px-1 py-0.5">{a.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右：選択枠の設定 */}
        <div className="w-52 shrink-0 space-y-3">
          <div>
            <div className="text-[11px] text-stage-600 font-semibold tracking-wider mb-1">枠 {selCell + 1}（{filledCount}/{cells.length} 使用）</div>
            <select className="dds-select w-full" value={assign[selCell] ?? ''} onChange={(e) => setCellAsset(selCell, e.target.value || null)}>
              <option value="">（未割り当て）</option>
              {mediaAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {assign[selCell] && (
              <button onClick={() => setCellAsset(selCell, null)} className="text-[10px] text-stage-600 hover:text-red-500 mt-1">この枠を空にする</button>
            )}
          </div>
          {sel && (
            <>
              <Slider label={`横位置 (${Math.round(sel.x)})`} min={-50} max={50} value={sel.x} onChange={(v) => adjust({ x: v })} />
              <Slider label={`縦位置 (${Math.round(sel.y)})`} min={-50} max={50} value={sel.y} onChange={(v) => adjust({ y: v })} />
              <Slider label={`サイズ (${Math.round(sel.scale * 100)}%)`} min={5} max={100} value={Math.round(sel.scale * 100)} onChange={(v) => adjust({ scale: v / 100 })} />
              <div className="flex gap-1.5">
                <button onClick={() => adjust({ layer: sel.layer + 1 })} className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">前面へ</button>
                <button onClick={() => adjust({ layer: sel.layer - 1 })} className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">背面へ</button>
              </div>
            </>
          )}
          <div>
            <div className="text-[11px] text-stage-600 mb-1">表示時間（秒）</div>
            <input type="number" min="1" step="0.5" className="dds-input w-full" value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="text-[11px] text-stage-600">各素材は別レイヤーとして配置（後から個別に編集・キーフレーム可）。</span>
        <div className="flex gap-2">
          <button onClick={close} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600">キャンセル</button>
          <button onClick={place} className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow">タイムラインに配置</button>
        </div>
      </div>
    </ModalShell>
  )
}

function CellThumb({ asset }: { asset: MediaAsset }) {
  const [thumb, setThumb] = useState<string | null>(() => getThumb(asset.id, asset.url, asset.kind))
  useEffect(() => {
    if (thumb) return
    const g = getThumb(asset.id, asset.url, asset.kind)
    if (g) { setThumb(g); return }
    const onReady = (e: Event) => {
      if ((e as CustomEvent).detail?.assetId === asset.id) { const v = getThumb(asset.id, asset.url, asset.kind); if (v) setThumb(v) }
    }
    window.addEventListener('dds-thumb-ready', onReady)
    return () => window.removeEventListener('dds-thumb-ready', onReady)
  }, [asset.id, thumb])
  if (thumb) return <img src={thumb} className="w-full h-full object-cover" />
  return <div className="w-full h-full flex items-center justify-center text-white/40 text-lg">{asset.kind === 'video' ? '🎞' : '🖼'}</div>
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-stage-600 mb-1 block">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-dream-violet" />
    </label>
  )
}

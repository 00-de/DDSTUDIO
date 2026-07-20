import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'
import { LAYOUTS, layoutById, type Cell } from '@/lib/collage'

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

  const layout = layoutById(layoutId)!

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

  const place = () => {
    const items = cells
      .map((c, i) => ({ assetId: assign[i], x: c.x, y: c.y, scale: c.scale, layer: c.layer }))
      .filter((it): it is { assetId: string; x: number; y: number; scale: number; layer: number } => !!it.assetId)
    if (items.length === 0) { alert('各枠に素材を割り当ててください。'); return }
    createCollage(items, currentTime, duration)
    close()
  }

  const adjust = (patch: Partial<Cell>) => {
    setCells((prev) => prev.map((c, i) => (i === selCell ? { ...c, ...patch } : c)))
  }

  const sel = cells[selCell]

  return (
    <ModalShell title="コラージュ / PiP" onClose={close} wide>
      <div className="flex gap-4">
        {/* 左：レイアウト選択 */}
        <div className="w-40 shrink-0 space-y-1.5 max-h-[62vh] overflow-y-auto pr-1">
          <div className="text-[11px] text-stage-600 font-semibold tracking-wider mb-1">レイアウト</div>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => chooseLayout(l.id)}
              className={'w-full text-left text-xs px-2 py-1.5 rounded-md border ' + (layoutId === l.id ? 'dream-gradient text-white border-transparent' : 'border-stage-700 hover:border-dream-violet')}>
              {l.name}
            </button>
          ))}
        </div>

        {/* 中央：プレビュー（枠をクリックで選択） */}
        <div className="flex-1 min-w-0">
          <div className="relative bg-black rounded-lg overflow-hidden ring-1 ring-stage-800" style={{ aspectRatio: '16 / 9' }}>
            {cells.map((c, i) => {
              const asset = assign[i] ? project.assets.find((a) => a.id === assign[i]) : null
              return (
                <div key={i}
                  onClick={() => setSelCell(i)}
                  className={'absolute overflow-hidden cursor-pointer ' + (selCell === i ? 'ring-2 ring-dream-cyan z-10' : 'ring-1 ring-white/30')}
                  style={{
                    left: `${50 + c.x - c.scale * 50}%`, top: `${50 + c.y - c.scale * 50}%`,
                    width: `${c.scale * 100}%`, height: `${c.scale * 100}%`,
                    background: asset ? undefined : 'rgba(255,255,255,0.06)',
                  }}>
                  {asset ? (
                    asset.kind === 'image'
                      ? <img src={asset.url} className="w-full h-full object-cover" />
                      : <video src={asset.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50 text-lg font-bold">{i + 1}</div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-[11px] text-stage-600 mt-2">枠をクリックで選択 → 右で素材を割り当て・微調整できます。</div>
        </div>

        {/* 右：選択枠の設定 */}
        <div className="w-56 shrink-0 space-y-3">
          <div>
            <div className="text-[11px] text-stage-600 font-semibold tracking-wider mb-1">枠 {selCell + 1} の素材</div>
            <select className="dds-select w-full" value={assign[selCell] ?? ''} onChange={(e) => setCellAsset(selCell, e.target.value || null)}>
              <option value="">（未割り当て）</option>
              {mediaAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
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

      <div className="flex justify-between items-center mt-5">
        <span className="text-[11px] text-stage-600">各素材は別レイヤーとして配置されます（後から個別に編集・キーフレーム可）。</span>
        <div className="flex gap-2">
          <button onClick={close} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600">キャンセル</button>
          <button onClick={place} className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow">タイムラインに配置</button>
        </div>
      </div>
    </ModalShell>
  )
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-stage-600 mb-1 block">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-dream-violet" />
    </label>
  )
}

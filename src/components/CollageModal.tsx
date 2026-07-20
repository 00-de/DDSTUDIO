import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'
import { LAYOUTS, layoutById, type Cell } from '@/lib/collage'
import { getThumb } from '@/lib/thumbs'
import { importMedia } from '@/lib/actions'
import type { MediaAsset } from '@/types'

type Deco = { borderWidth: number; borderColor: string; borderRadius: number; frameShadow: boolean }
const NO_DECO: Deco = { borderWidth: 0, borderColor: '#ffffff', borderRadius: 0, frameShadow: false }

export default function CollageModal() {
  const close = () => useStore.getState().openModal(null)
  const project = useStore((s) => s.project)
  const createCollage = useStore((s) => s.createCollage)
  const currentTime = useStore((s) => s.currentTime)

  const mediaAssets = useMemo(
    () => project.assets.filter((a) => a.kind === 'video' || a.kind === 'image'),
    [project.assets]
  )

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [layoutId, setLayoutId] = useState('g4')
  const [cells, setCells] = useState<Cell[]>(() => layoutById('g4')!.cells.map((c) => ({ ...c })))
  const [assign, setAssign] = useState<(string | null)[]>(() => Array(4).fill(null))
  const [decos, setDecos] = useState<Deco[]>(() => Array(4).fill(0).map(() => ({ ...NO_DECO })))
  const [selCell, setSelCell] = useState(0)
  const [duration, setDuration] = useState(8)
  const [dragAsset, setDragAsset] = useState<string | null>(null)
  const [dropCell, setDropCell] = useState<number | null>(null)

  const chooseLayout = (id: string) => {
    const l = layoutById(id)!
    setLayoutId(id)
    setCells(l.cells.map((c) => ({ ...c })))
    setAssign(Array(l.count).fill(null))
    setDecos(Array(l.count).fill(0).map(() => ({ ...NO_DECO })))
    setSelCell(0)
  }

  const setCellAsset = (i: number, id: string | null) => setAssign((p) => { const n = [...p]; n[i] = id; return n })
  const assignToFirstEmpty = (id: string) => setAssign((p) => {
    const n = [...p]; const e = n.findIndex((v) => v == null); if (e >= 0) n[e] = id; else n[selCell] = id; return n
  })
  const adjustCell = (patch: Partial<Cell>) => setCells((p) => p.map((c, i) => (i === selCell ? { ...c, ...patch } : c)))
  const adjustDeco = (patch: Partial<Deco>) => setDecos((p) => p.map((d, i) => (i === selCell ? { ...d, ...patch } : d)))

  const filled = assign.filter(Boolean).length

  const place = () => {
    const items = cells.map((c, i) => ({
      assetId: assign[i], x: c.x, y: c.y, scale: c.scale, layer: c.layer,
      borderWidth: decos[i]?.borderWidth || undefined,
      borderColor: decos[i]?.borderColor,
      borderRadius: decos[i]?.borderRadius || undefined,
      frameShadow: decos[i]?.frameShadow || undefined,
    })).filter((it): it is typeof it & { assetId: string } => !!it.assetId)
    if (items.length === 0) { alert('素材を入れてください。'); return }
    createCollage(items, currentTime, duration)
    close()
  }

  // ドロップエリア共通（枠 or まとめ枠）
  const Cells = ({ interactive }: { interactive: boolean }) => (
    <div className="relative bg-black rounded-lg overflow-hidden ring-1 ring-stage-800 w-full mx-auto" style={{ aspectRatio: '16 / 9', maxHeight: '48vh' }}>
      {cells.map((c, i) => {
        const asset = assign[i] ? project.assets.find((a) => a.id === assign[i]) : null
        const d = decos[i] ?? NO_DECO
        return (
          <div key={i}
            onClick={() => interactive && setSelCell(i)}
            onDragOver={(e) => { if (dragAsset) { e.preventDefault(); setDropCell(i) } }}
            onDragLeave={() => setDropCell((x) => (x === i ? null : x))}
            onDrop={(e) => { e.preventDefault(); if (dragAsset) { setCellAsset(i, dragAsset); setSelCell(i) } setDropCell(null); setDragAsset(null) }}
            className={'absolute overflow-hidden ' + (interactive ? 'cursor-pointer ' : '') +
              (interactive && selCell === i ? 'ring-2 ring-dream-cyan z-10 ' : 'ring-1 ring-white/25 ') +
              (dropCell === i ? 'ring-2 ring-dream-pink z-20' : '')}
            style={{
              left: `${50 + c.x - c.scale * 50}%`, top: `${50 + c.y - c.scale * 50}%`,
              width: `${c.scale * 100}%`, height: `${c.scale * 100}%`,
              background: asset ? undefined : 'rgba(255,255,255,0.05)',
              border: d.borderWidth ? `${Math.max(1, d.borderWidth / 3)}px solid ${d.borderColor}` : undefined,
              borderRadius: d.borderRadius ? `${d.borderRadius / 3}px` : undefined,
              boxShadow: d.frameShadow ? '0 4px 14px rgba(0,0,0,0.5)' : undefined,
            }}>
            {asset ? <CellThumb asset={asset} /> : <div className="w-full h-full flex items-center justify-center text-white/45 text-sm font-bold">{i + 1}</div>}
          </div>
        )
      })}
    </div>
  )

  const sel = cells[selCell]
  const selDeco = decos[selCell] ?? NO_DECO

  return (
    <ModalShell title="コラージュ / PiP ウィザード" onClose={close} size="xl">
      {/* ステップ表示 */}
      <div className="flex items-center gap-2 mb-4 text-[12px]">
        {[[1, 'レイアウトを選ぶ'], [2, '素材を入れる'], [3, '詳細設定']].map(([n, label]) => (
          <div key={n as number} className="flex items-center gap-2">
            <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ' + (step === n ? 'dream-gradient text-white' : step > (n as number) ? 'bg-emerald-500 text-white' : 'bg-stage-800 text-stage-600')}>{n as number}</span>
            <span className={step === n ? 'text-slate-800 font-semibold' : 'text-stage-600'}>{label}</span>
            {(n as number) < 3 && <span className="text-stage-700 mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* STEP 1: レイアウト選択 */}
      {step === 1 && (
        <div className="grid grid-cols-4 gap-3" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => chooseLayout(l.id)}
              className={'rounded-lg border p-2 hover:border-dream-violet ' + (layoutId === l.id ? 'border-dream-violet ring-2 ring-dream-violet/40' : 'border-stage-700')}>
              <div className="relative bg-stage-950 rounded w-full mb-1.5" style={{ aspectRatio: '16/9' }}>
                {l.cells.map((c, i) => (
                  <div key={i} className="absolute bg-dream-violet/30 border border-dream-violet/60 rounded-[2px]"
                    style={{ left: `${50 + c.x - c.scale * 50}%`, top: `${50 + c.y - c.scale * 50}%`, width: `${c.scale * 100}%`, height: `${c.scale * 100}%` }} />
                ))}
              </div>
              <div className="text-[11px] text-center text-slate-700">{l.name}</div>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: 素材を入れる */}
      {step === 2 && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { if (dragAsset) e.preventDefault() }}
            className="relative"
          >
            <Cells interactive={false} />
          </div>
          <div className="rounded-lg border border-stage-800 bg-stage-850 p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-stage-600">素材をクリック＝空き枠へ／ドラッグ＝好きな枠へ（{filled}/{cells.length} 使用）</span>
              <button onClick={() => importMedia()} className="text-[11px] px-2 py-1 rounded-md dream-gradient text-white font-semibold hover:brightness-110">＋ 素材を読み込む</button>
            </div>
            {mediaAssets.length === 0 ? (
              <div className="text-[12px] text-stage-500 py-6 text-center border border-dashed border-stage-700 rounded-md">
                ビデオ＆画像をここに入れます。<br />「＋ 素材を読み込む」から追加してください（.jfif / jpg / png / mp4 など）。
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mediaAssets.map((a) => (
                  <button key={a.id} draggable
                    onDragStart={() => setDragAsset(a.id)} onDragEnd={() => { setDragAsset(null); setDropCell(null) }}
                    onClick={() => assignToFirstEmpty(a.id)} title={a.name}
                    className="shrink-0 w-28 rounded-md overflow-hidden border border-stage-700 hover:border-dream-violet cursor-grab active:cursor-grabbing">
                    <div className="w-full aspect-video bg-stage-950"><CellThumb asset={a} /></div>
                    <div className="text-[9px] text-stage-500 truncate px-1 py-0.5">{a.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: 詳細設定 */}
      {step === 3 && (
        <div className="flex gap-4">
          <div className="flex-1 min-w-0"><Cells interactive /></div>
          <div className="w-60 shrink-0 space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
            <div className="text-[11px] text-dream-violet font-semibold">枠 {selCell + 1} の設定 {assign[selCell] ? '' : '（素材なし）'}</div>
            <select className="dds-select w-full" value={assign[selCell] ?? ''} onChange={(e) => setCellAsset(selCell, e.target.value || null)}>
              <option value="">（未割り当て）</option>
              {mediaAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {sel && (<>
              <Slider label={`横位置 (${Math.round(sel.x)})`} min={-50} max={50} value={sel.x} onChange={(v) => adjustCell({ x: v })} />
              <Slider label={`縦位置 (${Math.round(sel.y)})`} min={-50} max={50} value={sel.y} onChange={(v) => adjustCell({ y: v })} />
              <Slider label={`サイズ (${Math.round(sel.scale * 100)}%)`} min={5} max={100} value={Math.round(sel.scale * 100)} onChange={(v) => adjustCell({ scale: v / 100 })} />
              <div className="flex gap-1.5">
                <button onClick={() => adjustCell({ layer: sel.layer + 1 })} className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">前面へ</button>
                <button onClick={() => adjustCell({ layer: sel.layer - 1 })} className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">背面へ</button>
              </div>
              <div className="border-t border-stage-800 pt-2">
                <div className="text-[11px] text-stage-600 mb-1 font-semibold">枠飾り</div>
                <Slider label={`枠線の太さ (${selDeco.borderWidth}px)`} min={0} max={24} value={selDeco.borderWidth} onChange={(v) => adjustDeco({ borderWidth: v })} />
                <div className="flex items-center gap-2 my-1">
                  <span className="text-[11px] text-stage-600">枠線の色</span>
                  <input type="color" value={selDeco.borderColor} onChange={(e) => adjustDeco({ borderColor: e.target.value })} className="w-8 h-7 rounded bg-white border border-stage-700" />
                </div>
                <Slider label={`角丸 (${selDeco.borderRadius}px)`} min={0} max={80} value={selDeco.borderRadius} onChange={(v) => adjustDeco({ borderRadius: v })} />
                <label className="flex items-center gap-2 text-[11px] text-stage-600 mt-1">
                  <input type="checkbox" checked={selDeco.frameShadow} onChange={(e) => adjustDeco({ frameShadow: e.target.checked })} /> 影をつける
                </label>
              </div>
            </>)}
            <div className="border-t border-stage-800 pt-2">
              <div className="text-[11px] text-stage-600 mb-1">表示時間（秒）</div>
              <input type="number" min="1" step="0.5" className="dds-input w-full" value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
        </div>
      )}

      {/* フッター：ステップ移動 */}
      <div className="flex justify-between items-center mt-5">
        <button onClick={close} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600">キャンセル</button>
        <div className="flex gap-2">
          {step > 1 && <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="px-4 py-2 rounded-md border border-stage-700 hover:border-dream-violet">‹ 戻る</button>}
          {step < 3
            ? <button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)} className="px-6 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow">次へ ›</button>
            : <button onClick={place} className="px-6 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow">タイムラインに配置</button>}
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
    const onReady = (e: Event) => { if ((e as CustomEvent).detail?.assetId === asset.id) { const v = getThumb(asset.id, asset.url, asset.kind); if (v) setThumb(v) } }
    window.addEventListener('dds-thumb-ready', onReady)
    return () => window.removeEventListener('dds-thumb-ready', onReady)
  }, [asset.id, thumb])
  if (thumb) return <img src={thumb} className="w-full h-full object-cover" />
  return <div className="w-full h-full flex items-center justify-center text-white/40 text-lg">{asset.kind === 'video' ? '🎞' : '🖼'}</div>
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-stage-600 mb-0.5 block">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-dream-violet" />
    </label>
  )
}

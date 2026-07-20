import { useEffect, useRef, useState } from 'react'
import { tick } from '@/lib/previewAudio'

// dB スケール（0dB=上端, -60dB=下端）
const MIN_DB = -60
// 振幅(0〜1) → dB
function toDb(level: number): number {
  if (level <= 0.0001) return MIN_DB
  return Math.max(MIN_DB, 20 * Math.log10(level))
}
// dB → 0〜1（メーター上の位置。下=0, 上=1）
function dbToPos(db: number): number {
  return Math.min(1, Math.max(0, (db - MIN_DB) / (0 - MIN_DB)))
}

const SCALE = [0, -6, -12, -18, -24, -30, -40, -50]

export default function MasterMeter() {
  const [lv, setLv] = useState<[number, number]>([0, 0])
  const peak = useRef<[number, number]>([0, 0])
  const [peaks, setPeaks] = useState<[number, number]>([0, 0])
  const raf = useRef<number>()
  const [showScale, setShowScale] = useState(true)

  useEffect(() => {
    const loop = () => {
      const [l, r] = tick()
      setLv([l, r])
      peak.current = [Math.max(l, peak.current[0] * 0.99), Math.max(r, peak.current[1] * 0.99)]
      setPeaks([peak.current[0], peak.current[1]])
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [])

  const width = showScale ? 76 : 46
  const dbLabel = (lvl: number) => { const d = toDb(lvl); return d <= MIN_DB ? '-∞' : d.toFixed(1) }

  return (
    <div className="shrink-0 bg-stage-900 border-l border-stage-800 flex flex-col" style={{ width }}>
      <button
        onClick={() => setShowScale((v) => !v)}
        className="text-[10px] text-stage-600 hover:text-dream-violet text-center py-1.5 border-b border-stage-800 font-semibold tracking-wider"
        title="目盛り表示を切り替え"
      >
        マスタ {showScale ? '▾' : '▸'}
      </button>

      <div className="flex-1 flex justify-center gap-1 p-2 min-h-0">
        {/* 目盛り */}
        {showScale && (
          <div className="relative w-6 shrink-0">
            {SCALE.map((db) => (
              <div key={db} className="absolute right-0 -translate-y-1/2 text-[8px] text-stage-600 tabular-nums pr-0.5"
                style={{ bottom: `${dbToPos(db) * 100}%` }}>
                {db}
              </div>
            ))}
            <div className="absolute right-0 bottom-0 text-[8px] text-stage-600 pr-0.5">-∞</div>
          </div>
        )}
        <Meter level={lv[0]} peak={peaks[0]} />
        <Meter level={lv[1]} peak={peaks[1]} />
      </div>

      {/* L/R ラベル + dB 数値 */}
      <div className="grid grid-cols-2 gap-1 px-2 pb-1 text-center">
        <div className="text-[8px] text-stage-600 font-bold">L</div>
        <div className="text-[8px] text-stage-600 font-bold">R</div>
        <div className="text-[8px] text-stage-500 tabular-nums">{dbLabel(peaks[0])}</div>
        <div className="text-[8px] text-stage-500 tabular-nums">{dbLabel(peaks[1])}</div>
      </div>
    </div>
  )
}

function Meter({ level, peak }: { level: number; peak: number }) {
  const pos = dbToPos(toDb(level))      // 0〜1
  const peakPos = dbToPos(toDb(peak))
  // 目盛り位置（色帯の境界）
  const y0 = dbToPos(0)       // 上端
  const yYellow = dbToPos(-6)
  const yGreen = dbToPos(-18)

  return (
    <div className="relative flex-1 min-w-[10px] max-w-[16px] rounded-sm overflow-hidden border border-black/40" style={{ background: '#0a0b10' }}>
      {/* 背景の薄い色分け帯 */}
      <div className="absolute inset-x-0" style={{ bottom: `${yYellow * 100}%`, top: 0, background: 'rgba(239,68,68,0.10)' }} />
      <div className="absolute inset-x-0" style={{ bottom: `${yGreen * 100}%`, height: `${(yYellow - yGreen) * 100}%`, background: 'rgba(250,204,21,0.10)' }} />

      {/* レベル本体（緑→黄→赤） */}
      <div className="absolute inset-x-0 bottom-0" style={{
        height: `${pos * 100}%`,
        background: `linear-gradient(0deg,
          #16a34a 0%,
          #22c55e ${(yGreen / Math.max(pos, 0.0001)) * 100 * 0.5}%,
          #22c55e ${(yGreen / Math.max(pos, 0.0001)) * 100}%,
          #fbbf24 ${(yYellow / Math.max(pos, 0.0001)) * 100}%,
          #ef4444 100%)`,
        transition: 'height 30ms linear',
      }} />

      {/* ピークホールド線 */}
      {peak > 0.005 && (
        <div className="absolute inset-x-0 h-[2px] bg-white/90" style={{ bottom: `${peakPos * 100}%` }} />
      )}

      {/* 0dB ライン（クリップ注意） */}
      <div className="absolute inset-x-0 h-px bg-red-500/60" style={{ bottom: `${y0 * 100}%` }} />

      {/* 目盛り線 */}
      {SCALE.map((db) => (
        <div key={db} className="absolute inset-x-0 h-px bg-black/30" style={{ bottom: `${dbToPos(db) * 100}%` }} />
      ))}
    </div>
  )
}

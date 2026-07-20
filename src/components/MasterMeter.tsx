import { useEffect, useRef, useState } from 'react'
import { tick } from '@/lib/previewAudio'

// マスター音量メーター（実際の再生音を解析）
export default function MasterMeter() {
  const [levels, setLevels] = useState<[number, number]>([0, 0])
  const peak = useRef<[number, number]>([0, 0])
  const [peaks, setPeaks] = useState<[number, number]>([0, 0])
  const raf = useRef<number>()

  useEffect(() => {
    const loop = () => {
      const [l, r] = tick()
      setLevels([l, r])
      peak.current = [
        Math.max(l, peak.current[0] * 0.985),
        Math.max(r, peak.current[1] * 0.985),
      ]
      setPeaks([peak.current[0], peak.current[1]])
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [])

  const dB = (lv: number) => (lv <= 0.02 ? '-inf' : (20 * Math.log10(lv)).toFixed(1))

  return (
    <div className="w-16 shrink-0 bg-stage-900 border-l border-stage-800 flex flex-col">
      <div className="text-[10px] text-stage-600 text-center py-1.5 border-b border-stage-800 font-semibold tracking-wider">マスタ</div>
      <div className="flex-1 flex justify-center gap-1 p-2">
        <Meter level={levels[0]} peak={peaks[0]} />
        <Meter level={levels[1]} peak={peaks[1]} />
      </div>
      <div className="text-[9px] text-stage-600 text-center pb-2 tabular-nums leading-tight">
        <div>{dB(peaks[0])}</div>
        <div>{dB(peaks[1])}</div>
      </div>
    </div>
  )
}

function Meter({ level, peak }: { level: number; peak: number }) {
  const marks = [0, -3, -6, -9, -12, -18, -24]
  return (
    <div className="relative w-4 rounded-sm overflow-hidden" style={{ background: '#0b0c11' }}>
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${Math.min(100, level * 100)}%`,
          background: 'linear-gradient(0deg,#22c55e 0%,#22c55e 55%,#fbbf24 78%,#ef4444 100%)',
          transition: 'height 40ms linear',
        }}
      />
      {/* ピークホールド線 */}
      {peak > 0.02 && (
        <div className="absolute left-0 right-0 h-px bg-white" style={{ bottom: `${Math.min(100, peak * 100)}%` }} />
      )}
      {marks.map((m) => (
        <div key={m} className="absolute left-0 right-0 h-px bg-black/40" style={{ bottom: `${((m + 30) / 30) * 100}%` }} />
      ))}
    </div>
  )
}

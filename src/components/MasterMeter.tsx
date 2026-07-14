import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'

// マスター音量メーター（VEGAS 風）。再生中に動く簡易メーター。
export default function MasterMeter() {
  const playing = useStore((s) => s.playing)
  const [levels, setLevels] = useState<[number, number]>([0.05, 0.05])
  const raf = useRef<number>()
  const target = useRef<[number, number]>([0.05, 0.05])

  useEffect(() => {
    let t = 0
    const tick = () => {
      t += 0.08
      if (playing) {
        // それらしく揺れる擬似レベル
        target.current = [
          0.45 + 0.4 * Math.abs(Math.sin(t * 1.3)) + Math.random() * 0.1,
          0.45 + 0.4 * Math.abs(Math.sin(t * 1.1 + 1)) + Math.random() * 0.1,
        ]
      } else {
        target.current = [0.04, 0.04]
      }
      setLevels((cur) => [
        cur[0] + (target.current[0] - cur[0]) * 0.35,
        cur[1] + (target.current[1] - cur[1]) * 0.35,
      ])
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [playing])

  return (
    <div className="w-16 shrink-0 bg-stage-900 border-l border-stage-800 flex flex-col">
      <div className="text-[10px] text-stage-600 text-center py-1.5 border-b border-stage-800 font-semibold tracking-wider">マスタ</div>
      <div className="flex-1 flex justify-center gap-1 p-2">
        {levels.map((lv, i) => (
          <Meter key={i} level={lv} />
        ))}
      </div>
      <div className="text-[9px] text-stage-600 text-center pb-2 tabular-nums">
        {levels.map((lv, i) => (
          <div key={i}>{(lv <= 0.05 ? '-inf' : (lv * 12 - 12).toFixed(1))}</div>
        ))}
      </div>
    </div>
  )
}

function Meter({ level }: { level: number }) {
  // 目盛り（dB）
  const marks = [0, -3, -6, -9, -12, -18, -24]
  return (
    <div className="relative w-4 rounded-sm overflow-hidden" style={{ background: '#0b0c11' }}>
      {/* グラデーション帯（下=緑 上=赤） */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${Math.min(100, level * 100)}%`,
          background: 'linear-gradient(0deg,#22c55e 0%,#22c55e 55%,#fbbf24 78%,#ef4444 100%)',
          transition: 'height 60ms linear',
        }}
      />
      {/* 目盛り線 */}
      {marks.map((m) => (
        <div key={m} className="absolute left-0 right-0 h-px bg-black/40" style={{ bottom: `${((m + 30) / 30) * 100}%` }} />
      ))}
    </div>
  )
}

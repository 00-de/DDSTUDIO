import { useEffect, useRef, useState } from 'react'
import { getWaveform } from '@/lib/waveform'

// クリップ内に波形を描画する Canvas
export default function Waveform({ assetId, src, kind, width, height, color = 'rgba(255,255,255,0.55)' }: {
  assetId: string; src: string; kind: string; width: number; height: number; color?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(() => getWaveform(assetId, src, kind))

  useEffect(() => {
    if (peaks && peaks.length) return
    const got = getWaveform(assetId, src, kind)
    if (got && got.length) { setPeaks(got); return }
    const onReady = (e: Event) => {
      if ((e as CustomEvent).detail?.assetId === assetId) {
        const g = getWaveform(assetId, src, kind)
        if (g && g.length) setPeaks(g)
      }
    }
    window.addEventListener('dds-wave-ready', onReady)
    return () => window.removeEventListener('dds-wave-ready', onReady)
  }, [assetId, src, kind, peaks])

  useEffect(() => {
    const cv = ref.current
    if (!cv || !peaks || !peaks.length) return
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    const dpr = window.devicePixelRatio || 1
    cv.width = w * dpr; cv.height = h * dpr
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = color

    const mid = h / 2
    const n = peaks.length
    // 幅に合わせてピクセル単位で描画（ピークを間引き/引き伸ばし）
    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * n)
      const p = peaks[Math.min(n - 1, idx)]
      const barH = Math.max(1, p * (h - 2))
      ctx.fillRect(x, mid - barH / 2, 1, barH)
    }
  }, [peaks, width, height, color])

  if (!peaks || !peaks.length) return null
  return <canvas ref={ref} className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ width, height }} />
}

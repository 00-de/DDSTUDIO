import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'

type Style =
  | 'confetti' | 'petalFall' | 'snow' | 'rain' | 'starTwinkle'
  | 'heartRise' | 'sparkleRise' | 'bubble' | 'fire' | 'smoke'
  | 'firework' | 'shooting' | 'laser' | 'spotlight' | 'lightray'

// 各エフェクトの描画スタイルと色
const STYLE_MAP: Record<string, { style: Style; colors: string[] }> = {
  confetti: { style: 'confetti', colors: ['#EC4899', '#22D3EE', '#A855F7', '#FBBF24', '#22C55E'] },
  sakura: { style: 'petalFall', colors: ['#F9A8D4', '#FBCFE8', '#F472B6'] },
  petal: { style: 'petalFall', colors: ['#FB7185', '#FDA4AF', '#F43F5E'] },
  star: { style: 'starTwinkle', colors: ['#FBBF24', '#FDE68A', '#FFFFFF'] },
  heart: { style: 'heartRise', colors: ['#F472B6', '#EC4899', '#FB7185'] },
  laser: { style: 'laser', colors: ['#22D3EE', '#A855F7', '#EC4899', '#22C55E'] },
  spotlight: { style: 'spotlight', colors: ['#FDE68A', '#FFFFFF', '#A855F7'] },
  sparkle: { style: 'sparkleRise', colors: ['#A78BFA', '#FFFFFF', '#22D3EE'] },
  fire: { style: 'fire', colors: ['#F97316', '#FBBF24', '#EF4444'] },
  smoke: { style: 'smoke', colors: ['#94A3B8', '#CBD5E1'] },
  snow: { style: 'snow', colors: ['#FFFFFF', '#BAE6FD'] },
  rain: { style: 'rain', colors: ['#60A5FA', '#93C5FD'] },
  bubble: { style: 'bubble', colors: ['#7DD3FC', '#BAE6FD'] },
  lightray: { style: 'lightray', colors: ['#FDE047', '#FEF9C3'] },
  firework: { style: 'firework', colors: ['#C084FC', '#F472B6', '#22D3EE', '#FBBF24'] },
  shooting: { style: 'shooting', colors: ['#38BDF8', '#FFFFFF'] },
}

interface P {
  x: number; y: number; vx: number; vy: number
  size: number; color: string; life: number; maxLife: number
  rot: number; vr: number; seed: number
}

function rnd(a: number, b: number) { return a + Math.random() * (b - a) }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

export default function EffectsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const partsRef = useRef<Record<string, P[]>>({})
  const rafRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let last = performance.now()

    const spawn = (style: Style, colors: string[], w: number, h: number, arr: P[]) => {
      const mk = (o: Partial<P>): P => ({
        x: 0, y: 0, vx: 0, vy: 0, size: 8, color: pick(colors), life: 1, maxLife: 1, rot: 0, vr: 0, seed: Math.random(), ...o,
      })
      switch (style) {
        case 'confetti':
          arr.push(mk({ x: rnd(0, w), y: -10, vx: rnd(-30, 30), vy: rnd(60, 140), size: rnd(6, 12), rot: rnd(0, 6), vr: rnd(-4, 4), maxLife: 6, life: 6 }))
          break
        case 'petalFall':
          arr.push(mk({ x: rnd(0, w), y: -10, vx: rnd(-20, 20), vy: rnd(30, 70), size: rnd(10, 18), rot: rnd(0, 6), vr: rnd(-2, 2), maxLife: 8, life: 8 }))
          break
        case 'snow':
          arr.push(mk({ x: rnd(0, w), y: -10, vx: rnd(-10, 10), vy: rnd(25, 55), size: rnd(3, 7), maxLife: 9, life: 9 }))
          break
        case 'rain':
          arr.push(mk({ x: rnd(0, w), y: -20, vx: rnd(-30, -10), vy: rnd(500, 750), size: rnd(10, 20), maxLife: 2, life: 2 }))
          break
        case 'starTwinkle':
          arr.push(mk({ x: rnd(0, w), y: rnd(0, h), size: rnd(6, 16), maxLife: rnd(1.2, 2.5), life: rnd(1.2, 2.5) }))
          break
        case 'heartRise':
        case 'sparkleRise':
          arr.push(mk({ x: rnd(0, w), y: h + 10, vx: rnd(-15, 15), vy: rnd(-70, -110), size: rnd(12, 22), maxLife: 4, life: 4 }))
          break
        case 'bubble':
          arr.push(mk({ x: rnd(0, w), y: h + 10, vx: rnd(-10, 10), vy: rnd(-40, -80), size: rnd(6, 20), maxLife: 6, life: 6 }))
          break
        case 'fire':
          arr.push(mk({ x: rnd(w * 0.2, w * 0.8), y: h + 5, vx: rnd(-15, 15), vy: rnd(-90, -160), size: rnd(10, 22), maxLife: 1.6, life: 1.6 }))
          break
        case 'smoke':
          arr.push(mk({ x: rnd(w * 0.3, w * 0.7), y: h + 5, vx: rnd(-8, 8), vy: rnd(-30, -60), size: rnd(20, 40), maxLife: 5, life: 5 }))
          break
        case 'shooting':
          arr.push(mk({ x: rnd(0, w * 0.6), y: rnd(0, h * 0.4), vx: rnd(300, 480), vy: rnd(160, 260), size: rnd(40, 70), maxLife: 1.4, life: 1.4 }))
          break
      }
    }

    const draw = (style: Style, p: P, ctx: CanvasRenderingContext2D) => {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife))
      ctx.globalAlpha = a
      ctx.fillStyle = p.color
      ctx.strokeStyle = p.color
      switch (style) {
        case 'confetti':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); break
        case 'petalFall': {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.beginPath(); ctx.ellipse(0, 0, p.size / 2, p.size / 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); break
        }
        case 'snow': case 'bubble':
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
          if (style === 'bubble') { ctx.globalAlpha = a * 0.5; ctx.stroke() } else ctx.fill(); break
        case 'rain':
          ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + p.size); ctx.stroke(); break
        case 'starTwinkle': {
          const tw = 0.4 + 0.6 * Math.sin(p.seed * 6 + (p.maxLife - p.life) * 6)
          ctx.globalAlpha = a * tw; star(ctx, p.x, p.y, p.size / 2); break
        }
        case 'heartRise': ctx.globalAlpha = a; heart(ctx, p.x, p.y, p.size); break
        case 'sparkleRise': ctx.globalAlpha = a; star(ctx, p.x, p.y, p.size / 2); break
        case 'fire': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          g.addColorStop(0, p.color); g.addColorStop(1, 'transparent')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break
        }
        case 'smoke': {
          ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break
        }
        case 'shooting': {
          ctx.globalAlpha = a; ctx.lineWidth = 2
          const ang = Math.atan2(p.vy, p.vx)
          ctx.beginPath(); ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - Math.cos(ang) * p.size, p.y - Math.sin(ang) * p.size); ctx.stroke()
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill(); break
        }
      }
      ctx.globalAlpha = 1
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const st = useStore.getState()
      const t = st.currentTime
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      ctx.clearRect(0, 0, w, h)

      // 再生ヘッド上のエフェクトクリップを収集
      const active = new Set<string>()
      for (const tr of st.project.tracks) {
        if (tr.type !== 'effect' || tr.hidden) continue
        for (const c of tr.clips) {
          if (c.effectId && STYLE_MAP[c.effectId] && t >= c.start && t < c.start + c.duration) active.add(c.effectId)
        }
      }

      const store = partsRef.current
      for (const id of Object.keys(STYLE_MAP)) {
        const conf = STYLE_MAP[id]
        const arr = (store[id] ||= [])
        const on = active.has(id)

        if (on) {
          // 特殊: レーザー・スポットライト・光線・花火はビーム/描画型
          if (conf.style === 'laser') { drawLaser(ctx, w, h, now, conf.colors); continue }
          if (conf.style === 'spotlight') { drawSpotlight(ctx, w, h, now, conf.colors); continue }
          if (conf.style === 'lightray') { drawLightray(ctx, w, h, now, conf.colors); continue }
          if (conf.style === 'firework') { fireworkTick(ctx, w, h, dt, arr, conf.colors); continue }

          // 粒子生成レート
          const rate = conf.style === 'rain' ? 8 : conf.style === 'snow' ? 3 : conf.style === 'fire' ? 6 : conf.style === 'shooting' ? 0.4 : conf.style === 'starTwinkle' ? 1.5 : 2.5
          for (let i = 0; i < rate; i++) if (Math.random() < 0.9) spawn(conf.style, conf.colors, w, h, arr)
        }

        // 既存粒子の更新（onでなくても消えるまで描く）
        for (let i = arr.length - 1; i >= 0; i--) {
          const p = arr[i]
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt
          if (conf.style === 'petalFall') p.x += Math.sin((p.maxLife - p.life) * 2 + p.seed * 6) * 20 * dt
          if (conf.style === 'fire' || conf.style === 'smoke' || conf.style === 'starTwinkle' || conf.style === 'heartRise' || conf.style === 'sparkleRise' || conf.style === 'bubble') p.life -= dt
          else if (p.y > h + 40 || p.x < -60 || p.x > w + 60) p.life = 0
          else p.life -= dt * 0.02
          if (p.life <= 0) { arr.splice(i, 1); continue }
          draw(conf.style, p, ctx)
        }
        if (arr.length > 400) arr.splice(0, arr.length - 400)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

/* ---- ビーム/描画系エフェクト ---- */
function drawLaser(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, colors: string[]) {
  const beams = 6
  for (let i = 0; i < beams; i++) {
    const phase = now / 1000 + i
    const x = w / 2 + Math.sin(phase * 0.8 + i) * (w * 0.45)
    ctx.globalAlpha = 0.5
    const g = ctx.createLinearGradient(w / 2, h, x, 0)
    const col = colors[i % colors.length]
    g.addColorStop(0, col); g.addColorStop(1, 'transparent')
    ctx.strokeStyle = g; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(x, 0); ctx.stroke()
  }
  ctx.globalAlpha = 1
}
function drawSpotlight(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, colors: string[]) {
  for (let i = 0; i < 3; i++) {
    const x = w / 2 + Math.sin(now / 1000 * 0.6 + i * 2.1) * (w * 0.3)
    const col = colors[i % colors.length]
    ctx.globalAlpha = 0.28
    const g = ctx.createRadialGradient(x, 0, 0, x, h * 0.7, h)
    g.addColorStop(0, col); g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - w * 0.18, h); ctx.lineTo(x + w * 0.18, h); ctx.closePath(); ctx.fill()
  }
  ctx.globalAlpha = 1
}
function drawLightray(ctx: CanvasRenderingContext2D, w: number, h: number, now: number, colors: string[]) {
  const n = 10
  for (let i = 0; i < n; i++) {
    const x = (w / n) * i + Math.sin(now / 1000 + i) * 8
    ctx.globalAlpha = 0.12 + 0.1 * Math.abs(Math.sin(now / 900 + i))
    const g = ctx.createLinearGradient(x, 0, x, h)
    g.addColorStop(0, colors[i % colors.length]); g.addColorStop(1, 'transparent')
    ctx.fillStyle = g; ctx.fillRect(x - 6, 0, 12, h)
  }
  ctx.globalAlpha = 1
}
function fireworkTick(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, arr: P[], colors: string[]) {
  if (Math.random() < dt * 1.6) {
    const cx = rnd(w * 0.15, w * 0.85), cy = rnd(h * 0.1, h * 0.5), col = pick(colors), n = 26
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n, sp = rnd(80, 180)
      arr.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 3, color: col, life: 1.3, maxLife: 1.3, rot: 0, vr: 0, seed: 0 })
    }
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i]
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt
    if (p.life <= 0) { arr.splice(i, 1); continue }
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

/* ---- 形状ヘルパ ---- */
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI / 2.5) * i - Math.PI / 2
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    const a2 = a + Math.PI / 5
    ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45)
  }
  ctx.closePath(); ctx.fill()
}
function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 20, s / 20)
  ctx.beginPath(); ctx.moveTo(0, 6)
  ctx.bezierCurveTo(-10, -4, -8, -14, 0, -8)
  ctx.bezierCurveTo(8, -14, 10, -4, 0, 6)
  ctx.closePath(); ctx.fill(); ctx.restore()
}

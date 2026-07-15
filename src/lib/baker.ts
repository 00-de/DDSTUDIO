import type { Project, Clip } from '@/types'

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
const bell = (p: number) => 1 - Math.abs(2 * p - 1)
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const RES_WH: Record<string, [number, number]> = {
  '720p': [1280, 720], '1080p': [1920, 1080], '2k': [2560, 1440], '4k': [3840, 2160],
}
export function resWH(r: string): [number, number] { return RES_WH[r] ?? [1920, 1080] }

// ---- エフェクト定義（EffectsCanvas と同じマッピング）----
type Style = 'confetti' | 'petalFall' | 'snow' | 'rain' | 'starTwinkle' | 'heartRise' | 'sparkleRise'
  | 'bubble' | 'fire' | 'smoke' | 'firework' | 'shooting' | 'laser' | 'spotlight' | 'lightray'
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
interface P { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number; rot: number; vr: number; seed: number }

function activeClips(project: Project, t: number, types: string[]): Clip[] {
  const out: Clip[] = []
  for (const tr of project.tracks) {
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

export type MediaEl = HTMLVideoElement | HTMLImageElement

export class Compositor {
  w: number; h: number
  parts: Record<string, P[]> = {}
  constructor(w: number, h: number) { this.w = w; this.h = h }

  drawFrame(ctx: CanvasRenderingContext2D, project: Project, t: number, dt: number, media: Map<string, MediaEl>) {
    const { w, h } = this
    ctx.clearRect(0, 0, w, h)

    const bg = activeClips(project, t, ['background'])[0]
    this.drawBackground(ctx, bg?.label)

    // カメラ演出（対象＝背景＋映像）
    const cam = activeClips(project, t, ['camera']).slice(-1)[0]

    // メイン映像（最前面の video/image クリップ）
    const vis = activeClips(project, t, ['video', 'image']).slice(-1)[0]
    if (vis) {
      const el = media.get(vis.id)
      if (el) this.drawMedia(ctx, el, vis, cam, t)
    }

    // 映画風レターボックス
    if (cam?.camera === '映画風') {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h * 0.12)
      ctx.fillRect(0, h * 0.88, w, h * 0.12)
    }

    // エフェクト
    this.drawEffects(ctx, project, t, dt)

    // テロップ・歌詞
    for (const c of activeClips(project, t, ['lyrics', 'subtitle'])) this.drawTelop(ctx, c, t)

    // トランジション（最前面）
    for (const c of activeClips(project, t, ['effect'])) if (c.transition) this.drawTransition(ctx, c, t)
  }

  drawBackground(ctx: CanvasRenderingContext2D, label?: string) {
    const { w, h } = this
    const g = (stops: [number, string][], vertical = false) => {
      const grad = ctx.createLinearGradient(0, 0, vertical ? 0 : w, vertical ? h : h)
      for (const [o, c] of stops) grad.addColorStop(o, c)
      return grad
    }
    let fill: string | CanvasGradient = '#0b0c11'
    switch (label) {
      case '単色': fill = '#0b0c11'; break
      case 'グラデーション': fill = g([[0, '#22d3ee'], [0.5, '#a855f7'], [1, '#ec4899']]); break
      case '宇宙': fill = g([[0, '#1e1b4b'], [1, '#05060a']], true); break
      case '海': fill = g([[0, '#0ea5e9'], [0.5, '#0369a1'], [1, '#082f49']], true); break
      case '夜景': fill = g([[0, '#0f172a'], [1, '#1e293b']], true); break
      case '桜並木': fill = g([[0, '#fbcfe8'], [0.5, '#f9a8d4'], [1, '#be185d']], true); break
      case 'ステージ': { const rg = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * 1.2); rg.addColorStop(0, '#4c1d95'); rg.addColorStop(0.6, '#1e1b4b'); rg.addColorStop(1, '#05060a'); fill = rg; break }
      case 'ライブLED': fill = g([[0, '#7c3aed'], [1, '#0b0c11']]); break
      case 'スクリーン': fill = g([[0, '#e2e8f0'], [1, '#94a3b8']], true); break
      default: fill = label ? g([[0, '#1e1b4b'], [0.5, '#4c1d95'], [1, '#831843']]) : '#000'
    }
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, w, h)
    if (label === '宇宙' || label === '夜景') {
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 60; i++) { const sx = (i * 137.5) % w; const sy = (i * 89.3) % h; ctx.globalAlpha = 0.5; ctx.fillRect(sx, sy, 2, 2) }
      ctx.globalAlpha = 1
    }
  }

  applyCamera(ctx: CanvasRenderingContext2D, cam: Clip | undefined, t: number) {
    const { w, h } = this
    if (!cam) return
    const p = clamp((t - cam.start) / Math.max(0.001, cam.duration), 0, 1)
    switch (cam.camera) {
      case 'ズーム': ctx.scale(1 + 0.35 * p, 1 + 0.35 * p); break
      case 'パン': ctx.scale(1.15, 1.15); ctx.translate(-0.1 * p * w, 0); break
      case '左右移動': ctx.scale(1.15, 1.15); ctx.translate((-0.12 + 0.24 * p) * w, 0); break
      case '上下移動': ctx.scale(1.15, 1.15); ctx.translate(0, (-0.12 + 0.24 * p) * h); break
      case '回転': ctx.scale(1.2, 1.2); ctx.rotate((-4 + 8 * p) * Math.PI / 180); break
      case '手ぶれ風': ctx.scale(1.06, 1.06); ctx.translate(Math.sin(t * 40) * 0.007 * w, Math.cos(t * 33) * 0.007 * h); break
      case '映画風': ctx.scale(1.05 + 0.1 * p, 1.05 + 0.1 * p); break
      case 'ライブ風': { const z = 1.1 + 0.06 * Math.abs(Math.sin(t * 6)); ctx.scale(z, z); ctx.rotate(Math.sin(t * 3) * 1.2 * Math.PI / 180); break }
    }
  }

  drawMedia(ctx: CanvasRenderingContext2D, el: MediaEl, clip: Clip, cam: Clip | undefined, t: number) {
    const { w, h } = this
    let ew = 0, eh = 0
    if (el instanceof HTMLVideoElement) { ew = el.videoWidth; eh = el.videoHeight }
    else { ew = el.naturalWidth; eh = el.naturalHeight }
    if (!ew || !eh) return
    const scaleFit = Math.min(w / ew, h / eh)
    const dw = ew * scaleFit, dh = eh * scaleFit

    ctx.save()
    ctx.globalAlpha = clamp(clipOpacity(clip, t), 0, 1)
    ctx.translate(w / 2, h / 2)
    this.applyCamera(ctx, cam, t)
    ctx.translate((clip.x ?? 0) / 100 * w, (clip.y ?? 0) / 100 * h)
    const sc = clip.scale ?? 1
    ctx.scale(sc * (clip.mirror ? -1 : 1), sc)
    ctx.rotate((clip.rotate ?? 0) * Math.PI / 180)
    try { ctx.drawImage(el, -dw / 2, -dh / 2, dw, dh) } catch { /* not ready */ }
    ctx.restore()
  }

  drawTelop(ctx: CanvasRenderingContext2D, c: Clip, t: number) {
    const { w, h } = this
    const text = c.text || c.label
    if (!text) return
    const fs = (c.fontSize ?? 48) * (this.h / 1080) * 1.4
    ctx.save()
    ctx.globalAlpha = clamp(clipOpacity(c, t), 0, 1)
    ctx.translate(w / 2 + (c.x ?? 0) / 100 * w, h / 2 + (c.y ?? 0) / 100 * h)
    ctx.scale(c.scale ?? 1, c.scale ?? 1)
    ctx.font = `900 ${fs}px "Yu Gothic UI", "Meiryo", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = fs * 0.2; ctx.shadowOffsetY = fs * 0.05
    ctx.lineWidth = fs * 0.12; ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.strokeText(text, 0, 0)
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = c.fontColor ?? '#fff'
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  drawTransition(ctx: CanvasRenderingContext2D, c: Clip, t: number) {
    const { w, h } = this
    const p = clamp((t - c.start) / Math.max(0.001, c.duration), 0, 1)
    const dir = c.direction ?? 'both'
    const color = c.transColor ?? '#000000'
    ctx.save()
    switch (c.transition) {
      case 'フェード': case 'クロスフェード': case 'ブラックアウト': {
        ctx.globalAlpha = dir === 'in' ? 1 - p : dir === 'out' ? p : bell(p); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); break
      }
      case 'ホワイトアウト': { ctx.globalAlpha = dir === 'in' ? 1 - p : dir === 'out' ? p : bell(p); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); break }
      case 'フラッシュ': { ctx.globalAlpha = Math.pow(bell(p), 0.6); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); break }
      case 'ワイプ': {
        ctx.fillStyle = color; const cover = dir === 'in' ? 1 - p : p
        if (dir === 'right') ctx.fillRect(w * (1 - cover), 0, w * cover, h)
        else if (dir === 'up') ctx.fillRect(0, 0, w, h * cover)
        else if (dir === 'down') ctx.fillRect(0, h * (1 - cover), w, h * cover)
        else ctx.fillRect(0, 0, w * cover, h)
        break
      }
      case 'スライド': {
        ctx.fillStyle = color; const off = (-1 + 2 * p) * (dir === 'right' || dir === 'down' ? 1 : -1)
        if (dir === 'up' || dir === 'down') ctx.fillRect(0, off * h, w, h); else ctx.fillRect(off * w, 0, w, h); break
      }
      case 'ズーム': {
        const r = (dir === 'in' ? p : dir === 'out' ? 1 - p : 1 - bell(p)) * 0.9
        const rg = ctx.createRadialGradient(w / 2, h / 2, r * Math.max(w, h), w / 2, h / 2, (r + 0.08) * Math.max(w, h))
        rg.addColorStop(0, 'transparent'); rg.addColorStop(1, color); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h); break
      }
      case '回転': {
        const deg = p * Math.PI * 2; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(w / 2, h / 2)
        ctx.arc(w / 2, h / 2, Math.hypot(w, h), -Math.PI / 2, -Math.PI / 2 + deg); ctx.closePath(); ctx.fill(); break
      }
    }
    ctx.restore()
  }

  // ---- パーティクル ----
  drawEffects(ctx: CanvasRenderingContext2D, project: Project, t: number, dt: number) {
    const { w, h } = this
    const active = new Set<string>()
    for (const tr of project.tracks) {
      if (tr.type !== 'effect' || tr.hidden) continue
      for (const c of tr.clips) if (c.effectId && STYLE_MAP[c.effectId] && t >= c.start && t < c.start + c.duration) active.add(c.effectId)
    }
    for (const id of Object.keys(STYLE_MAP)) {
      const conf = STYLE_MAP[id]
      const arr = (this.parts[id] ||= [])
      const on = active.has(id)
      if (on) {
        if (conf.style === 'laser') { this.laser(ctx, t, conf.colors); continue }
        if (conf.style === 'spotlight') { this.spot(ctx, t, conf.colors); continue }
        if (conf.style === 'lightray') { this.ray(ctx, t, conf.colors); continue }
        if (conf.style === 'firework') { this.firework(ctx, dt, arr, conf.colors); continue }
        const rate = conf.style === 'rain' ? 8 : conf.style === 'snow' ? 3 : conf.style === 'fire' ? 6 : conf.style === 'shooting' ? 0.4 : conf.style === 'starTwinkle' ? 1.5 : 2.5
        for (let i = 0; i < rate; i++) if (Math.random() < 0.9) this.spawn(conf.style, conf.colors, arr)
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i]
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt
        if (conf.style === 'petalFall') p.x += Math.sin((p.maxLife - p.life) * 2 + p.seed * 6) * 20 * dt
        if (['fire', 'smoke', 'starTwinkle', 'heartRise', 'sparkleRise', 'bubble'].includes(conf.style)) p.life -= dt
        else if (p.y > h + 40 || p.x < -60 || p.x > w + 60) p.life = 0
        else p.life -= dt * 0.02
        if (p.life <= 0) { arr.splice(i, 1); continue }
        this.drawParticle(ctx, conf.style, p)
      }
      if (arr.length > 500) arr.splice(0, arr.length - 500)
    }
  }
  spawn(style: Style, colors: string[], arr: P[]) {
    const { w, h } = this
    const mk = (o: Partial<P>): P => ({ x: 0, y: 0, vx: 0, vy: 0, size: 8, color: pick(colors), life: 1, maxLife: 1, rot: 0, vr: 0, seed: Math.random(), ...o })
    const S = h / 1080
    switch (style) {
      case 'confetti': arr.push(mk({ x: rnd(0, w), y: -10, vx: rnd(-30, 30) * S, vy: rnd(60, 140) * S, size: rnd(6, 12) * S, rot: rnd(0, 6), vr: rnd(-4, 4), maxLife: 6, life: 6 })); break
      case 'petalFall': arr.push(mk({ x: rnd(0, w), y: -10, vx: rnd(-20, 20) * S, vy: rnd(30, 70) * S, size: rnd(10, 18) * S, rot: rnd(0, 6), vr: rnd(-2, 2), maxLife: 8, life: 8 })); break
      case 'snow': arr.push(mk({ x: rnd(0, w), y: -10, vx: rnd(-10, 10) * S, vy: rnd(25, 55) * S, size: rnd(3, 7) * S, maxLife: 9, life: 9 })); break
      case 'rain': arr.push(mk({ x: rnd(0, w), y: -20, vx: rnd(-30, -10) * S, vy: rnd(500, 750) * S, size: rnd(10, 20) * S, maxLife: 2, life: 2 })); break
      case 'starTwinkle': arr.push(mk({ x: rnd(0, w), y: rnd(0, h), size: rnd(6, 16) * S, maxLife: rnd(1.2, 2.5), life: rnd(1.2, 2.5) })); break
      case 'heartRise': case 'sparkleRise': arr.push(mk({ x: rnd(0, w), y: h + 10, vx: rnd(-15, 15) * S, vy: rnd(-70, -110) * S, size: rnd(12, 22) * S, maxLife: 4, life: 4 })); break
      case 'bubble': arr.push(mk({ x: rnd(0, w), y: h + 10, vx: rnd(-10, 10) * S, vy: rnd(-40, -80) * S, size: rnd(6, 20) * S, maxLife: 6, life: 6 })); break
      case 'fire': arr.push(mk({ x: rnd(w * 0.2, w * 0.8), y: h + 5, vx: rnd(-15, 15) * S, vy: rnd(-90, -160) * S, size: rnd(10, 22) * S, maxLife: 1.6, life: 1.6 })); break
      case 'smoke': arr.push(mk({ x: rnd(w * 0.3, w * 0.7), y: h + 5, vx: rnd(-8, 8) * S, vy: rnd(-30, -60) * S, size: rnd(20, 40) * S, maxLife: 5, life: 5 })); break
      case 'shooting': arr.push(mk({ x: rnd(0, w * 0.6), y: rnd(0, h * 0.4), vx: rnd(300, 480) * S, vy: rnd(160, 260) * S, size: rnd(40, 70) * S, maxLife: 1.4, life: 1.4 })); break
    }
  }
  drawParticle(ctx: CanvasRenderingContext2D, style: Style, p: P) {
    const a = clamp(p.life / p.maxLife, 0, 1)
    ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.strokeStyle = p.color
    switch (style) {
      case 'confetti': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); break
      case 'petalFall': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.size / 2, p.size / 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); break
      case 'snow': case 'bubble': ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); if (style === 'bubble') { ctx.globalAlpha = a * 0.5; ctx.stroke() } else ctx.fill(); break
      case 'rain': ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + p.size); ctx.stroke(); break
      case 'starTwinkle': { const tw = 0.4 + 0.6 * Math.sin(p.seed * 6 + (p.maxLife - p.life) * 6); ctx.globalAlpha = a * tw; this.star(ctx, p.x, p.y, p.size / 2); break }
      case 'heartRise': this.heart(ctx, p.x, p.y, p.size); break
      case 'sparkleRise': this.star(ctx, p.x, p.y, p.size / 2); break
      case 'fire': { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size); g.addColorStop(0, p.color); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break }
      case 'smoke': ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break
      case 'shooting': { ctx.lineWidth = 2; const ang = Math.atan2(p.vy, p.vx); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(ang) * p.size, p.y - Math.sin(ang) * p.size); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill(); break }
    }
    ctx.globalAlpha = 1
  }
  laser(ctx: CanvasRenderingContext2D, now: number, colors: string[]) {
    const { w, h } = this
    for (let i = 0; i < 6; i++) { const x = w / 2 + Math.sin(now * 0.8 + i) * w * 0.45; ctx.globalAlpha = 0.5; const g = ctx.createLinearGradient(w / 2, h, x, 0); g.addColorStop(0, colors[i % colors.length]); g.addColorStop(1, 'transparent'); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(x, 0); ctx.stroke() }
    ctx.globalAlpha = 1
  }
  spot(ctx: CanvasRenderingContext2D, now: number, colors: string[]) {
    const { w, h } = this
    for (let i = 0; i < 3; i++) { const x = w / 2 + Math.sin(now * 0.6 + i * 2.1) * w * 0.3; ctx.globalAlpha = 0.28; const g = ctx.createRadialGradient(x, 0, 0, x, h * 0.7, h); g.addColorStop(0, colors[i % colors.length]); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - w * 0.18, h); ctx.lineTo(x + w * 0.18, h); ctx.closePath(); ctx.fill() }
    ctx.globalAlpha = 1
  }
  ray(ctx: CanvasRenderingContext2D, now: number, colors: string[]) {
    const { w, h } = this; const n = 10
    for (let i = 0; i < n; i++) { const x = (w / n) * i + Math.sin(now + i) * 8; ctx.globalAlpha = 0.12 + 0.1 * Math.abs(Math.sin(now + i)); const g = ctx.createLinearGradient(x, 0, x, h); g.addColorStop(0, colors[i % colors.length]); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(x - 6, 0, 12, h) }
    ctx.globalAlpha = 1
  }
  firework(ctx: CanvasRenderingContext2D, dt: number, arr: P[], colors: string[]) {
    const { w, h } = this
    if (Math.random() < dt * 1.6) { const cx = rnd(w * 0.15, w * 0.85), cy = rnd(h * 0.1, h * 0.5), col = pick(colors), n = 26; for (let i = 0; i < n; i++) { const a = (Math.PI * 2 * i) / n, sp = rnd(80, 180) * (h / 1080); arr.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 3, color: col, life: 1.3, maxLife: 1.3, rot: 0, vr: 0, seed: 0 }) } }
    for (let i = arr.length - 1; i >= 0; i--) { const p = arr[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; if (p.life <= 0) { arr.splice(i, 1); continue } ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill() }
    ctx.globalAlpha = 1
  }
  star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath()
    for (let i = 0; i < 5; i++) { const a = (Math.PI / 2.5) * i - Math.PI / 2; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); const a2 = a + Math.PI / 5; ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45) }
    ctx.closePath(); ctx.fill()
  }
  heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s / 20, s / 20); ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-10, -4, -8, -14, 0, -8); ctx.bezierCurveTo(8, -14, 10, -4, 0, 6); ctx.closePath(); ctx.fill(); ctx.restore()
  }
}

// 素材からサムネイル/フィルムストリップを生成してキャッシュする
const single = new Map<string, string>()            // assetId -> dataURL（1枚：素材パネル用）
const strip = new Map<string, string[]>()           // key -> フレーム配列（タイムライン用）
const pendingSingle = new Map<string, Promise<void>>()
const pendingStrip = new Map<string, Promise<void>>()

const THUMB_W = 160

function notify(assetId: string) {
  window.dispatchEvent(new CustomEvent('dds-thumb-ready', { detail: { assetId } }))
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
    setTimeout(() => resolve(null), 6000)
  })
}

function drawToDataURL(src: CanvasImageSource, sw: number, sh: number): string {
  const c = document.createElement('canvas')
  const w = THUMB_W
  const h = Math.max(1, Math.round((sh / sw) * w)) || 90
  c.width = w; c.height = h
  c.getContext('2d')!.drawImage(src, 0, 0, w, h)
  return c.toDataURL('image/jpeg', 0.6)
}

// 動画：複数フレーム抽出
function extractFrames(url: string, count: number): Promise<string[]> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.crossOrigin = 'anonymous'
    const frames: string[] = []
    let idx = 0
    let dur = 0
    let done = false

    const finish = () => {
      if (done) return
      done = true
      try { v.removeAttribute('src'); v.load() } catch { /* noop */ }
      resolve(frames)
    }

    const seekNext = () => {
      if (idx >= count) return finish()
      const frac = count === 1 ? 0.1 : (idx + 0.5) / count
      const time = Math.min(Math.max(0.05, dur * frac), Math.max(0.05, dur - 0.05))
      try { v.currentTime = time } catch { finish() }
    }

    v.onloadeddata = () => { dur = v.duration || 1; seekNext() }
    v.onseeked = () => {
      if (done) return
      try { frames.push(drawToDataURL(v, v.videoWidth || 160, v.videoHeight || 90)) } catch { /* skip */ }
      idx++
      seekNext()
    }
    v.onerror = () => finish()
    setTimeout(finish, 15000)
  })
}

// 1枚サムネ（素材パネル用）
export function getThumb(assetId: string, url: string, kind: string): string | null {
  const hit = single.get(assetId)
  if (hit !== undefined) return hit || null
  if (!pendingSingle.has(assetId)) {
    const run = async () => {
      let data = ''
      if (kind === 'image') { const img = await loadImage(url); if (img) data = drawToDataURL(img, img.naturalWidth, img.naturalHeight) }
      else if (kind === 'video') { const fs = await extractFrames(url, 1); if (fs[0]) data = fs[0] }
      single.set(assetId, data)
      pendingSingle.delete(assetId)
      notify(assetId)
    }
    pendingSingle.set(assetId, run())
  }
  return null
}

// フィルムストリップ（タイムライン用）
export function getStrip(assetId: string, url: string, kind: string, frames: number): string[] | null {
  const key = `${assetId}:${frames}`
  const hit = strip.get(key)
  if (hit !== undefined) return hit.length ? hit : null
  if (!pendingStrip.has(key)) {
    const run = async () => {
      let arr: string[] = []
      if (kind === 'image') {
        const img = await loadImage(url)
        if (img) { const one = drawToDataURL(img, img.naturalWidth, img.naturalHeight); arr = Array(frames).fill(one) }
      } else if (kind === 'video') {
        arr = await extractFrames(url, frames)
      }
      strip.set(key, arr)
      pendingStrip.delete(key)
      notify(assetId)
    }
    pendingStrip.set(key, run())
  }
  return null
}

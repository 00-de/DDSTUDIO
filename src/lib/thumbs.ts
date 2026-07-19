// 素材からサムネイル(dataURL)を生成してキャッシュする
const cache = new Map<string, string>()       // assetId -> dataURL
const pending = new Map<string, Promise<string | null>>()

function makeVideoThumb(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.crossOrigin = 'anonymous'
    let done = false
    const finish = (val: string | null) => {
      if (done) return
      done = true
      try { v.removeAttribute('src'); v.load() } catch { /* noop */ }
      resolve(val)
    }
    v.onloadeddata = () => {
      // 少し進めた位置のフレームを使う（真っ黒対策）
      try { v.currentTime = Math.min(0.5, (v.duration || 1) * 0.1) } catch { /* noop */ }
    }
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        const w = 160
        const h = Math.max(1, Math.round((v.videoHeight / v.videoWidth) * w)) || 90
        c.width = w; c.height = h
        const ctx = c.getContext('2d')!
        ctx.drawImage(v, 0, 0, w, h)
        finish(c.toDataURL('image/jpeg', 0.6))
      } catch {
        finish(null)
      }
    }
    v.onerror = () => finish(null)
    setTimeout(() => finish(null), 6000)
  })
}

function makeImageThumb(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        const w = 160
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w)) || 90
        c.width = w; c.height = h
        c.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.6))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
    setTimeout(() => resolve(null), 6000)
  })
}

export function getThumb(assetId: string, url: string, kind: string): string | null {
  const hit = cache.get(assetId)
  if (hit !== undefined) return hit
  if (!pending.has(assetId)) {
    const p = (kind === 'video' ? makeVideoThumb(url) : kind === 'image' ? makeImageThumb(url) : Promise.resolve(null))
      .then((val) => {
        cache.set(assetId, val ?? '')
        pending.delete(assetId)
        // 生成できたら再描画を促す
        window.dispatchEvent(new CustomEvent('dds-thumb-ready', { detail: { assetId } }))
        return val
      })
    pending.set(assetId, p)
  }
  return null
}

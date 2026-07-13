import type { MediaKind } from '@/types'

export function kindFromExt(ext: string): MediaKind {
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'audio'
  return 'image'
}

const FALLBACK = { video: 8, audio: 30, image: 5 }

// 動画・音声の実尺（秒）を読み取る。画像や読み取り失敗時は既定値を返す。
export function getMediaDuration(url: string, kind: MediaKind): Promise<number> {
  if (kind === 'image') return Promise.resolve(FALLBACK.image)

  return new Promise((resolve) => {
    const el = document.createElement(kind === 'audio' ? 'audio' : 'video') as HTMLMediaElement
    el.preload = 'metadata'
    let settled = false

    const finish = (d: number) => {
      if (settled) return
      settled = true
      try {
        el.removeAttribute('src')
        el.load()
      } catch {
        /* noop */
      }
      resolve(Math.max(0.5, Math.round(d * 10) / 10))
    }

    el.onloadedmetadata = () => {
      const d = isFinite(el.duration) && el.duration > 0 ? el.duration : FALLBACK[kind]
      finish(d)
    }
    el.onerror = () => finish(FALLBACK[kind])
    // 読み取りが返らない形式（avi/flac 等）への保険
    setTimeout(() => finish(FALLBACK[kind]), 8000)

    el.src = url
  })
}

// 素材の音声を解析して波形（各バケットのピーク値 0〜1）を生成・キャッシュする
const cache = new Map<string, number[]>()          // assetId -> peaks
const pending = new Map<string, Promise<void>>()

// 波形の解像度（1素材あたりのサンプル点数）
const BUCKETS = 800

let sharedCtx: AudioContext | null = null
function actx(): AudioContext {
  if (!sharedCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new AC()
  }
  return sharedCtx
}

function notify(assetId: string) {
  window.dispatchEvent(new CustomEvent('dds-wave-ready', { detail: { assetId } }))
}

async function analyze(src: string): Promise<number[]> {
  // ローカルファイルはメインプロセス経由で読む（fetch は file:// で失敗するため）
  let buf: ArrayBuffer | null = null
  if (window.dds?.readFileBytes) {
    buf = await window.dds.readFileBytes(src)
  }
  if (!buf) {
    // フォールバック（dev の http など）
    const res = await fetch(src)
    buf = await res.arrayBuffer()
  }
  const audio = await actx().decodeAudioData(buf)

  const chCount = audio.numberOfChannels
  const len = audio.length
  const peaks = new Array(BUCKETS).fill(0)
  const block = Math.max(1, Math.floor(len / BUCKETS))

  // 全チャンネルの絶対値ピークをバケットごとに取る
  for (let ch = 0; ch < chCount; ch++) {
    const data = audio.getChannelData(ch)
    for (let b = 0; b < BUCKETS; b++) {
      const start = b * block
      const end = Math.min(len, start + block)
      let peak = 0
      // 間引きしつつピークを取得（重すぎないように最大2048サンプル/バケット）
      const step = Math.max(1, Math.floor((end - start) / 2048))
      for (let i = start; i < end; i += step) {
        const v = Math.abs(data[i])
        if (v > peak) peak = v
      }
      if (peak > peaks[b]) peaks[b] = peak
    }
  }

  // 正規化（最大値を1に寄せる。無音対策で下限）
  const max = peaks.reduce((m, v) => Math.max(m, v), 0.0001)
  const norm = peaks.map((v) => Math.min(1, v / max))
  return norm
}

/** 素材の波形ピーク配列を返す。まだ無ければ解析を開始して null。src はファイルパス推奨 */
export function getWaveform(assetId: string, src: string, kind: string): number[] | null {
  if (kind !== 'audio' && kind !== 'video') return null
  const hit = cache.get(assetId)
  if (hit) return hit
  if (!pending.has(assetId)) {
    const run = async () => {
      try {
        const peaks = await analyze(src)
        cache.set(assetId, peaks)
      } catch (e) {
        console.warn('波形解析に失敗:', e)
        cache.set(assetId, [])
      }
      pending.delete(assetId)
      notify(assetId)
    }
    pending.set(assetId, run())
  }
  return null
}

/** クリップ範囲に対応する波形の一部を取り出す（trim等は未対応：全体を使用） */
export function sliceWaveform(peaks: number[], _startFrac = 0, _endFrac = 1): number[] {
  return peaks
}

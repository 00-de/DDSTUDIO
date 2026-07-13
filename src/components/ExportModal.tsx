import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'

const FORMATS = ['mp4', 'mov', 'avi', 'webm', 'gif']
const RESOLUTIONS: { id: '720p' | '1080p' | '2k' | '4k'; label: string }[] = [
  { id: '720p', label: '720P' },
  { id: '1080p', label: '1080P' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
]

export default function ExportModal() {
  const project = useStore((s) => s.project)
  const close = () => useStore.getState().openModal(null)

  const [format, setFormat] = useState('mp4')
  const [resolution, setResolution] = useState(project.resolution)
  const [fps, setFps] = useState(project.fps)
  const [codec, setCodec] = useState('H.264')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [done, setDone] = useState<{ ok: boolean; msg: string; filePath?: string } | null>(null)

  // メイン動画トラックのクリップ（素材にひも付くもの）
  const videoClips = project.tracks
    .filter((t) => t.type === 'video')
    .flatMap((t) => t.clips)
    .sort((a, b) => a.start - b.start)
    .map((c) => project.assets.find((a) => a.id === c.assetId))
    .filter((a): a is NonNullable<typeof a> => !!a && a.kind === 'video')
    .map((a) => ({ path: a.path }))

  useEffect(() => {
    const off = window.dds?.onExportProgress((line) => {
      const m = line.match(/time=(\d+:\d+:\d+\.\d+)/)
      if (m) setProgress(m[1])
    })
    return () => off?.()
  }, [])

  const runExport = async () => {
    if (videoClips.length === 0) {
      setDone({ ok: false, msg: '書き出せる動画クリップがありません。「動画」トラックに素材を追加してください。' })
      return
    }
    setBusy(true)
    setDone(null)
    setProgress('')
    const res = await window.dds.exportVideo({ clips: videoClips, format, resolution, fps })
    setBusy(false)
    if (res.ok) setDone({ ok: true, msg: '書き出しが完了しました。', filePath: res.filePath })
    else if (res.canceled) setDone(null)
    else setDone({ ok: false, msg: res.error ?? '書き出しに失敗しました。' })
  }

  return (
    <ModalShell title="書き出し" onClose={busy ? () => {} : close} wide>
      <div className="space-y-5">
        <div>
          <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">形式</div>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((f) => (
              <Pill key={f} active={format === f} onClick={() => setFormat(f)}>{f.toUpperCase()}</Pill>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">解像度</div>
          <div className="flex gap-2 flex-wrap">
            {RESOLUTIONS.map((r) => (
              <Pill key={r.id} active={resolution === r.id} onClick={() => setResolution(r.id)}>{r.label}</Pill>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">フレームレート</div>
            <div className="flex gap-2">
              <Pill active={fps === 30} onClick={() => setFps(30)}>30fps</Pill>
              <Pill active={fps === 60} onClick={() => setFps(60)}>60fps</Pill>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stage-600 mb-2 font-semibold tracking-wider">コーデック</div>
            <div className="flex gap-2 flex-wrap">
              {['H.264', 'H.265', 'AV1'].map((c) => (
                <Pill key={c} active={codec === c} onClick={() => setCodec(c)}>{c}</Pill>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-stage-900 border border-stage-800 p-3 text-[11px] text-stage-600 leading-relaxed">
          Ver.1.0 は「動画」トラックのクリップを連結して書き出します（対象: {videoClips.length}件）。
          歌詞・エフェクト・カメラ演出の合成書き出しは今後のバージョンで対応予定です。
        </div>

        {busy && (
          <div className="flex items-center gap-3 text-sm text-dream-cyan">
            <span className="w-4 h-4 border-2 border-dream-cyan border-t-transparent rounded-full animate-spin" />
            書き出し中… {progress && <span className="tabular-nums text-stage-600">{progress}</span>}
          </div>
        )}

        {done && (
          <div className={'text-sm rounded-lg p-3 ' + (done.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300')}>
            {done.msg}
            {done.ok && done.filePath && (
              <button
                onClick={() => window.dds.showInFolder(done.filePath!)}
                className="ml-2 underline hover:text-white"
              >
                フォルダを開く
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={close} disabled={busy} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600 disabled:opacity-40">
          キャンセル
        </button>
        <button
          onClick={runExport}
          disabled={busy}
          className="px-6 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow disabled:opacity-60"
        >
          {busy ? '処理中…' : '書き出し開始'}
        </button>
      </div>
    </ModalShell>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded-md text-sm transition-colors ' +
        (active ? 'dream-gradient text-white' : 'border border-stage-700 text-stage-600 hover:border-dream-violet hover:text-white')
      }
    >
      {children}
    </button>
  )
}

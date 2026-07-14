import { useRef } from 'react'
import { useStore } from '@/store/useStore'
import { timecode } from '@/lib/format'

export default function PreviewTransport() {
  const { currentTime, playing, togglePlay, setCurrentTime, setPlaying } = useStore()
  const project = useStore((s) => s.project)
  const barRef = useRef<HTMLDivElement>(null)

  const dur = project.durationSec
  const fps = project.fps
  const frame = 1 / fps

  const seekFromX = (clientX: number) => {
    const el = barRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    setCurrentTime(ratio * dur)
  }

  return (
    <div className="bg-stage-900 border-t border-stage-800 px-3 py-1.5 flex flex-col gap-1.5 shrink-0">
      {/* シークバー */}
      <div
        ref={barRef}
        className="relative h-2 bg-stage-950 rounded-full cursor-pointer group"
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          seekFromX(e.clientX)
        }}
        onPointerMove={(e) => { if (e.buttons === 1) seekFromX(e.clientX) }}
      >
        <div className="absolute inset-y-0 left-0 rounded-full dream-gradient" style={{ width: `${(currentTime / dur) * 100}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow -ml-1.5"
          style={{ left: `${(currentTime / dur) * 100}%` }}
        />
      </div>

      {/* ボタン列 + タイムコード */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-dream-cyan font-mono tabular-nums mr-2">{timecode(currentTime, fps)}</span>

        <TBtn title="先頭へ" onClick={() => setCurrentTime(0)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5l-11 7 11 7z" /></svg>
        </TBtn>
        <TBtn title="1フレーム戻る" onClick={() => setCurrentTime(Math.max(0, currentTime - frame))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 5l-9 7 9 7zM17 5h2v14h-2z" /></svg>
        </TBtn>
        <TBtn title="再生 / 停止 (Space)" onClick={() => togglePlay()} big>
          {playing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>
          )}
        </TBtn>
        <TBtn title="停止" onClick={() => { setPlaying(false); setCurrentTime(0) }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
        </TBtn>
        <TBtn title="1フレーム進む" onClick={() => setCurrentTime(Math.min(dur, currentTime + frame))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5l9 7-9 7zM5 5h2v14H5z" /></svg>
        </TBtn>
        <TBtn title="最後へ" onClick={() => setCurrentTime(dur)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5l11 7-11 7z" /></svg>
        </TBtn>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-stage-600 font-mono tabular-nums">{timecode(dur, fps)}</span>
          <TBtn title="全画面 (F11)" onClick={() => document.documentElement.requestFullscreen().catch(() => {})}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" strokeLinecap="round" /></svg>
          </TBtn>
        </div>
      </div>
    </div>
  )
}

function TBtn({ title, onClick, children, big }: { title: string; onClick: () => void; children: React.ReactNode; big?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        'flex items-center justify-center rounded-md transition-colors ' +
        (big ? 'w-9 h-8 text-dream-violet hover:text-white hover:bg-stage-750' : 'w-7 h-7 text-stage-600 hover:text-white hover:bg-stage-800')
      }
    >
      {children}
    </button>
  )
}

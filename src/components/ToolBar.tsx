import { useStore } from '@/store/useStore'
import { importMedia, saveProject } from '@/lib/actions'

function Btn({
  onClick,
  title,
  children,
  disabled,
  accent,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
  accent?: boolean
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        'h-8 w-8 tool-btn ' +
        (accent ? 'text-dream-violet hover:text-dream-violet ' : '') +
        (disabled ? 'opacity-30 cursor-default' : '')
      }
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-stage-800 mx-1.5" />
}

export default function ToolBar() {
  const s = useStore()
  const sel = s.selectedClipId
  const canUndo = s.past.length > 0
  const canRedo = s.future.length > 0

  return (
    <div className="h-11 bg-stage-900 border-b border-stage-800 flex items-center px-2 gap-0.5">
      <Btn title="素材を読み込む (D&D対応)" onClick={() => importMedia()} accent>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </Btn>
      <Btn title="保存 (Ctrl+S)" onClick={() => saveProject(false)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <path d="M17 21v-8H7v8M7 3v5h8" />
        </svg>
      </Btn>

      <Divider />

      <Btn title="分割" disabled={!sel} onClick={() => sel && s.splitClip(sel, s.currentTime)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M8 8H4M8 16H4M20 8h-4M20 16h-4" strokeLinecap="round" />
        </svg>
      </Btn>
      <Btn title="複製 (Ctrl+D)" disabled={!sel} onClick={() => sel && s.duplicateClip(sel)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      </Btn>
      <Btn title="削除 (Delete)" disabled={!sel} onClick={() => sel && s.removeClip(sel)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" />
        </svg>
      </Btn>

      <Divider />

      <Btn title="元に戻す (Ctrl+Z)" disabled={!canUndo} onClick={() => s.undo()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 9h11a5 5 0 0 1 0 10h-1" strokeLinecap="round" />
        </svg>
      </Btn>
      <Btn title="やり直し (Ctrl+Y)" disabled={!canRedo} onClick={() => s.redo()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 14l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 9H9a5 5 0 0 0 0 10h1" strokeLinecap="round" />
        </svg>
      </Btn>

      <Divider />

      {/* トランスポート */}
      <Btn title="先頭へ" onClick={() => s.setCurrentTime(0)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 5h2v14H6zM20 5l-10 7 10 7z" />
        </svg>
      </Btn>
      <Btn title="再生 / 停止 (Space)" onClick={() => s.togglePlay()} accent>
        {s.playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5l12 7-12 7z" />
          </svg>
        )}
      </Btn>

      <Divider />

      <Btn title="タイムライン縮小" onClick={() => s.setZoom(s.zoom - 4)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M8 11h6M21 21l-4-4" strokeLinecap="round" />
        </svg>
      </Btn>
      <Btn title="タイムライン拡大" onClick={() => s.setZoom(s.zoom + 4)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M11 8v6M8 11h6M21 21l-4-4" strokeLinecap="round" />
        </svg>
      </Btn>

      <div className="ml-auto" />

      <button
        onClick={() => s.openModal('telop')}
        className="h-8 px-3 rounded-md border border-stage-700 text-stage-600 hover:text-dream-violet hover:border-dream-violet text-sm font-medium flex items-center gap-1.5 mr-1"
        title="テロップ・歌詞を追加"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V5h16v2M9 5v14M7 19h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        テロップ
      </button>

      <button
        onClick={() => s.openModal('export')}
        className="h-8 px-4 rounded-md dream-gradient text-white text-sm font-semibold hover:brightness-110 shadow-glow flex items-center gap-1.5"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        書き出し
      </button>
    </div>
  )
}

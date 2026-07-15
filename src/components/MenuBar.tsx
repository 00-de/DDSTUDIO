import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { saveProject, openProject } from '@/lib/actions'
import { buildEDL, buildFCPXML } from '@/lib/interop'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  divider?: boolean
}

async function exportInterop(kind: 'edl' | 'fcpxml') {
  const project = useStore.getState().project
  const hasVideo = project.tracks.some((t) => t.type === 'video' && t.clips.length > 0)
  if (!hasVideo) {
    alert('「動画」トラックにクリップがありません。先に素材を配置してください。')
    return
  }
  if (kind === 'edl') {
    const res = await window.dds.saveTextFile(buildEDL(project), 'edl', 'EDL (CMX3600)')
    if (res.ok) alert('EDL を保存しました。\nVEGAS Pro なら「ファイル → 読み込み」から取り込めます。')
  } else {
    const res = await window.dds.saveTextFile(buildFCPXML(project), 'xml', 'Final Cut XML')
    if (res.ok) alert('Final Cut XML を保存しました。\nPremiere / DaVinci Resolve の「読み込み」から使えます。')
  }
}

export default function MenuBar() {
  const [open, setOpen] = useState<string | null>(null)
  const s = useStore()

  const menus: Record<string, MenuItem[]> = {
    ファイル: [
      { label: '新規プロジェクト', shortcut: 'Ctrl+N', action: () => s.createProject() },
      { label: 'プロジェクトを開く', shortcut: 'Ctrl+O', action: () => openProject() },
      { label: '', divider: true },
      { label: '保存', shortcut: 'Ctrl+S', action: () => saveProject(false) },
      { label: '名前を付けて保存', shortcut: 'Ctrl+Shift+S', action: () => saveProject(true) },
      { label: '', divider: true },
      { label: '他ソフト用: EDL (VEGAS/Premiere/Resolve)', action: () => exportInterop('edl') },
      { label: '他ソフト用: Final Cut XML (Premiere/Resolve)', action: () => exportInterop('fcpxml') },
      { label: '', divider: true },
      { label: '書き出し (動画/画像/音声)', shortcut: 'Ctrl+E', action: () => s.openModal('export') },
      { label: 'ホームに戻る', action: () => s.goHome() },
    ],
    編集: [
      { label: '元に戻す', shortcut: 'Ctrl+Z', action: () => s.undo() },
      { label: 'やり直し', shortcut: 'Ctrl+Y', action: () => s.redo() },
      { label: '', divider: true },
      { label: '複製', shortcut: 'Ctrl+D', action: () => s.selectedClipId && s.duplicateClip(s.selectedClipId) },
      { label: '削除', shortcut: 'Delete', action: () => s.selectedClipId && s.removeClip(s.selectedClipId) },
    ],
    表示: [
      { label: 'タイムライン拡大', action: () => s.setZoom(s.zoom + 4) },
      { label: 'タイムライン縮小', action: () => s.setZoom(s.zoom - 4) },
      { label: '', divider: true },
      { label: '全画面', shortcut: 'F11', action: () => document.documentElement.requestFullscreen().catch(() => {}) },
    ],
    設定: [
      { label: '環境設定', action: () => s.openModal('settings') },
    ],
    ヘルプ: [
      { label: 'DayDream Studio について', action: () => alert('DayDream Studio Ver.1.0\nDayDreamプラス専用 ライブ演出映像編集ソフト') },
    ],
  }

  return (
    <div
      className="h-8 bg-stage-900 border-b border-stage-800 flex items-center px-2 text-sm relative z-40"
      onMouseLeave={() => setOpen(null)}
    >
      <div className="flex items-center gap-1 mr-4 pl-1">
        <div className="w-4 h-4 rounded dream-gradient" />
        <span className="font-bold text-xs tracking-wide dream-text">DayDream Studio</span>
      </div>
      {Object.keys(menus).map((name) => (
        <div key={name} className="relative">
          <button
            className={'px-3 h-8 rounded-sm hover:bg-stage-800 ' + (open === name ? 'bg-stage-800' : '')}
            onClick={() => setOpen(open === name ? null : name)}
            onMouseEnter={() => open && setOpen(name)}
          >
            {name}
          </button>
          {open === name && (
            <div className="absolute top-8 left-0 min-w-[220px] bg-stage-850 border border-stage-700 rounded-md shadow-xl py-1">
              {menus[name].map((item, i) =>
                item.divider ? (
                  <div key={i} className="h-px bg-stage-700 my-1 mx-2" />
                ) : (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-dream-violet/20 text-left"
                    onClick={() => {
                      item.action?.()
                      setOpen(null)
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="text-xs text-stage-600 ml-6">{item.shortcut}</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

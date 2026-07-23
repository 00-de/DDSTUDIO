import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { saveProject, openProject } from '@/lib/actions'
import Home from '@/screens/Home'
import MenuBar from '@/components/MenuBar'
import ToolBar from '@/components/ToolBar'
import MaterialPanel from '@/components/MaterialPanel'
import Preview from '@/components/Preview'
import PreviewTransport from '@/components/PreviewTransport'
import MasterMeter from '@/components/MasterMeter'
import Timeline from '@/components/Timeline'
import PropertiesPanel from '@/components/PropertiesPanel'
import StatusBar from '@/components/StatusBar'
import SettingsModal from '@/components/SettingsModal'
import ExportModal from '@/components/ExportModal'
import TelopModal from '@/components/TelopModal'
import CollabModal from '@/components/CollabModal'
import LayoutEditor from '@/components/LayoutEditor'
import CollageModal from '@/components/CollageModal'

export default function App() {
  const screen = useStore((s) => s.screen)
  const modal = useStore((s) => s.modal)

  return (
    <div className="h-full w-full bg-stage-950 text-slate-800 flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {screen === 'home' ? (
          <motion.div
            key="home"
            className="flex-1 min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Home />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            className="flex-1 min-h-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Editor />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal === 'settings' && <SettingsModal key="settings" />}
        {modal === 'export' && <ExportModal key="export" />}
        {modal === 'telop' && <TelopModal key="telop" />}
        {modal === 'collab' && <CollabModal key="collab" />}
        {modal === 'layout' && <LayoutEditor key="layout" />}
        {modal === 'collage' && <CollageModal key="collage" />}
      </AnimatePresence>
    </div>
  )
}

function Editor() {
  const { playing, setCurrentTime, setPlaying, currentTime } = useStore()
  const durationSec = useStore((s) => s.project.durationSec)
  const fps = useStore((s) => s.project.fps)
  const rafRef = useRef<number>()
  const lastRef = useRef<number>()

  // プレビュー↔タイムラインの分割
  const containerRef = useRef<HTMLDivElement>(null)
  const [timelineH, setTimelineH] = useState(300)
  const splitDrag = useRef(false)

  const onSplitDown = (e: React.PointerEvent) => {
    splitDrag.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onSplitMove = (e: React.PointerEvent) => {
    if (!splitDrag.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const h = rect.bottom - e.clientY
    setTimelineH(Math.min(rect.height - 220, Math.max(140, h)))
  }
  const onSplitUp = () => { splitDrag.current = false }

  // 左右パネルの幅
  const [leftW, setLeftW] = useState(256)
  const [rightW, setRightW] = useState(288)
  const sideDrag = useRef<{ side: 'left' | 'right'; startX: number; startW: number } | null>(null)

  const startSide = (e: React.PointerEvent, side: 'left' | 'right') => {
    sideDrag.current = { side, startX: e.clientX, startW: side === 'left' ? leftW : rightW }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onSideMove = (e: React.PointerEvent) => {
    const d = sideDrag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (d.side === 'left') setLeftW(Math.min(760, Math.max(180, d.startW + dx)))
    else setRightW(Math.min(760, Math.max(200, d.startW - dx)))
  }
  const onSideUp = () => { sideDrag.current = null }

  // 再生ループ
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = undefined
      return
    }
    const tick = (t: number) => {
      if (lastRef.current == null) lastRef.current = t
      const dt = (t - lastRef.current) / 1000
      lastRef.current = t
      const next = useStore.getState().currentTime + dt
      if (next >= durationSec) {
        setCurrentTime(durationSec)
        setPlaying(false)
        return
      }
      setCurrentTime(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, durationSec, setCurrentTime, setPlaying])

  // キーボードショートカット
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const s = useStore.getState()
      const ctrl = e.ctrlKey || e.metaKey
      const frame = 1 / fps
      const dur = s.project.durationSec
      const t = s.currentTime
      const k = e.key.toLowerCase()

      if (ctrl && k === 'n') { e.preventDefault(); s.createProject() }
      else if (ctrl && k === 'o') { e.preventDefault(); openProject() }
      else if (ctrl && e.shiftKey && k === 's') { e.preventDefault(); saveProject(true) }
      else if (ctrl && k === 's') { e.preventDefault(); saveProject(false) }
      else if (ctrl && k === 'z') { e.preventDefault(); s.undo() }
      else if (ctrl && k === 'y') { e.preventDefault(); s.redo() }
      else if (ctrl && k === 'e') { e.preventDefault(); s.openModal('export') }
      else if (ctrl && k === 'd') { e.preventDefault(); s.selectedClipId && s.duplicateClip(s.selectedClipId) }
      else if (k === 'delete' || k === 'backspace') { if (s.selectedClipId) { e.preventDefault(); s.removeClip(s.selectedClipId) } }
      else if (e.code === 'Space') { e.preventDefault(); s.togglePlay() }
      else if (k === 'f11') { e.preventDefault(); toggleFullscreen() }
      // 再生ヘッド移動 / クリップ微調整
      else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.altKey && s.selectedClipId) nudgeClip(s.selectedClipId, e.shiftKey ? 1 : 0.1)
        else s.setCurrentTime(Math.min(dur, t + (e.shiftKey ? 1 : frame)))
      }
      else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (e.altKey && s.selectedClipId) nudgeClip(s.selectedClipId, e.shiftKey ? -1 : -0.1)
        else s.setCurrentTime(Math.max(0, t - (e.shiftKey ? 1 : frame)))
      }
      else if (e.key === 'Home') { e.preventDefault(); s.setCurrentTime(0) }
      else if (e.key === 'End') { e.preventDefault(); s.setCurrentTime(dur) }
      else if (k === 's' && !ctrl) { /* 分割 */ if (s.selectedClipId) { e.preventDefault(); s.splitClip(s.selectedClipId, t) } }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); s.setZoom(s.zoom + 4) }
      else if (e.key === '-') { e.preventDefault(); s.setZoom(s.zoom - 4) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fps])

  return (
    <>
      <MenuBar />
      <ToolBar />
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col"
        onPointerMove={onSplitMove} onPointerUp={onSplitUp}>
        {/* 上段：素材 / プレビュー＋トランスポート / プロパティ / マスター */}
        <div className="flex-1 min-h-0 flex" onPointerMove={onSideMove} onPointerUp={onSideUp}>
          <div className="shrink-0 border-r border-stage-800 bg-stage-900 flex flex-col overflow-hidden" style={{ width: leftW }}>
            <MaterialPanel onAutoWidth={(w) => setLeftW((cur) => (cur < w ? w : cur))} />
          </div>

          {/* 左の分割バー */}
          <div
            onPointerDown={(e) => startSide(e, 'left')}
            onDoubleClick={() => setLeftW(256)}
            className="w-1.5 shrink-0 cursor-col-resize bg-stage-800 hover:bg-dream-violet/60 transition-colors flex items-center justify-center group"
            title="ドラッグで素材パネルの幅を調整（ダブルクリックで初期値）"
          >
            <div className="h-10 w-0.5 rounded-full bg-stage-600 group-hover:bg-white" />
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 min-h-0 bg-stage-950 flex items-center justify-center p-4">
              <Preview />
            </div>
            <PreviewTransport />
          </div>

          {/* 右の分割バー */}
          <div
            onPointerDown={(e) => startSide(e, 'right')}
            onDoubleClick={() => setRightW(288)}
            className="w-1.5 shrink-0 cursor-col-resize bg-stage-800 hover:bg-dream-violet/60 transition-colors flex items-center justify-center group"
            title="ドラッグでプロパティパネルの幅を調整（ダブルクリックで初期値）"
          >
            <div className="h-10 w-0.5 rounded-full bg-stage-600 group-hover:bg-white" />
          </div>

          <div className="shrink-0 border-l border-stage-800 bg-stage-900 flex flex-col overflow-hidden" style={{ width: rightW }}>
            <PropertiesPanel />
          </div>
          <MasterMeter />
        </div>

        {/* 分割バー（ドラッグで上下の比率を変更） */}
        <div
          onPointerDown={onSplitDown}
          className="h-2 shrink-0 cursor-row-resize bg-stage-800 hover:bg-dream-violet/50 transition-colors flex items-center justify-center group"
          title="ドラッグでプレビューとタイムラインの高さを調整"
        >
          <div className="w-10 h-1 rounded-full bg-stage-600 group-hover:bg-white" />
        </div>

        {/* 下段：タイムライン（全幅・高さ可変） */}
        <div style={{ height: timelineH }} className="shrink-0 border-t border-stage-800 bg-stage-900">
          <Timeline />
        </div>
      </div>
      <StatusBar />
    </>
  )
}

function nudgeClip(id: string, delta: number) {
  const s = useStore.getState()
  for (const tr of s.project.tracks) {
    const c = tr.clips.find((c) => c.id === id)
    if (c) { s.moveClip(id, Math.max(0, c.start + delta)); return }
  }
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {})
  else await document.exitFullscreen().catch(() => {})
}

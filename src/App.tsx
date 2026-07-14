import { useEffect, useRef } from 'react'
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

export default function App() {
  const screen = useStore((s) => s.screen)
  const modal = useStore((s) => s.modal)

  return (
    <div className="h-full w-full bg-stage-950 text-white flex flex-col font-sans">
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
      </AnimatePresence>
    </div>
  )
}

function Editor() {
  const { playing, setCurrentTime, setPlaying, currentTime } = useStore()
  const durationSec = useStore((s) => s.project.durationSec)
  const rafRef = useRef<number>()
  const lastRef = useRef<number>()

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

      if (ctrl && e.key.toLowerCase() === 'n') { e.preventDefault(); s.createProject() }
      else if (ctrl && e.key.toLowerCase() === 'o') { e.preventDefault(); openProject() }
      else if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(true) }
      else if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(false) }
      else if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); s.undo() }
      else if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo() }
      else if (ctrl && e.key.toLowerCase() === 'e') { e.preventDefault(); s.openModal('export') }
      else if (e.key === 'Delete') { if (s.selectedClipId) { e.preventDefault(); s.removeClip(s.selectedClipId) } }
      else if (e.code === 'Space') { e.preventDefault(); s.togglePlay() }
      else if (e.key === 'F11') { e.preventDefault(); toggleFullscreen() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <MenuBar />
      <ToolBar />
      <div className="flex-1 min-h-0 flex flex-col">
        {/* 上段：素材 / プレビュー＋トランスポート / プロパティ / マスター */}
        <div className="flex-1 min-h-0 flex">
          <div className="w-64 shrink-0 border-r border-stage-800 bg-stage-900 flex flex-col">
            <MaterialPanel />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 min-h-0 bg-stage-950 flex items-center justify-center p-4">
              <Preview />
            </div>
            <PreviewTransport />
          </div>
          <div className="w-72 shrink-0 border-l border-stage-800 bg-stage-900 flex flex-col">
            <PropertiesPanel />
          </div>
          <MasterMeter />
        </div>
        {/* 下段：タイムライン（全幅） */}
        <div className="h-[42%] min-h-[260px] border-t border-stage-800 bg-stage-900">
          <Timeline />
        </div>
      </div>
      <StatusBar />
    </>
  )
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {})
  else await document.exitFullscreen().catch(() => {})
}

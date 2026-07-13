import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'

export default function StatusBar() {
  const project = useStore((s) => s.project)
  const dirty = useStore((s) => s.dirty)
  const gpu = useStore((s) => s.settings.gpuAcceleration)
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    window.dds?.getVersion().then(setVersion).catch(() => {})
  }, [])

  const clipCount = project.tracks.reduce((n, t) => n + t.clips.length, 0)

  return (
    <div className="h-6 bg-stage-900 border-t border-stage-800 flex items-center px-3 text-[11px] text-stage-600 gap-4">
      <span className="flex items-center gap-1.5">
        <span className={'w-1.5 h-1.5 rounded-full ' + (dirty ? 'bg-amber-400' : 'bg-emerald-400')} />
        {dirty ? '未保存の変更あり' : '保存済み'}
      </span>
      <span>クリップ: {clipCount}</span>
      <span>トラック: {project.tracks.length}</span>
      <span className="flex items-center gap-1">
        <span className={'w-1.5 h-1.5 rounded-full ' + (gpu ? 'bg-dream-cyan' : 'bg-stage-600')} />
        GPU {gpu ? 'ON' : 'OFF'}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span>{project.resolution.toUpperCase()} / {project.fps}fps</span>
        <span className="dream-text font-semibold">DayDream Studio v{version}</span>
      </div>
    </div>
  )
}

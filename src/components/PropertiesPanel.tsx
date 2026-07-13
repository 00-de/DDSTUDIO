import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { EFFECTS, BACKGROUNDS, TRANSITIONS, CAMERA_MOVES } from '@/lib/catalog'
import type { Clip } from '@/types'

export default function PropertiesPanel() {
  const [tab, setTab] = useState<'props' | 'effects' | 'stage'>('props')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-stage-800">
        <Tab active={tab === 'props'} onClick={() => setTab('props')}>プロパティ</Tab>
        <Tab active={tab === 'effects'} onClick={() => setTab('effects')}>エフェクト</Tab>
        <Tab active={tab === 'stage'} onClick={() => setTab('stage')}>演出</Tab>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'props' && <Props />}
        {tab === 'effects' && <Effects />}
        {tab === 'stage' && <Stage />}
      </div>
    </div>
  )
}

function Props() {
  const selectedId = useStore((s) => s.selectedClipId)
  const project = useStore((s) => s.project)
  const updateClip = useStore((s) => s.updateClip)
  const setName = useStore((s) => s.setName)
  const setResolution = useStore((s) => s.setResolution)
  const setFps = useStore((s) => s.setFps)

  const clip = findClip(project.tracks, selectedId)

  if (!clip) {
    return (
      <div className="p-3 space-y-4">
        <div className="text-[11px] text-stage-600 uppercase tracking-wider font-semibold">プロジェクト設定</div>
        <Field label="プロジェクト名">
          <input className="dds-input w-full" value={project.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="解像度">
          <select className="dds-select w-full" value={project.resolution} onChange={(e) => setResolution(e.target.value as never)}>
            <option value="720p">720P (HD)</option>
            <option value="1080p">1080P (Full HD)</option>
            <option value="2k">2K (QHD)</option>
            <option value="4k">4K (UHD)</option>
          </select>
        </Field>
        <Field label="フレームレート">
          <select className="dds-select w-full" value={project.fps} onChange={(e) => setFps(Number(e.target.value))}>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </Field>
        <div className="pt-4 text-[11px] text-stage-600 leading-relaxed">
          クリップを選択すると、ここで詳細を編集できます。
        </div>
      </div>
    )
  }

  const patch = (p: Partial<Clip>) => updateClip(clip.id, p)
  const isText = clip.kind === 'lyrics' || clip.kind === 'subtitle'
  const isVideo = clip.kind === 'video'
  const isImage = clip.kind === 'image'
  const isAudio = clip.kind === 'audio'
  const hasVisual = isVideo || isImage

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: clip.color }} />
        <span className="text-sm font-semibold truncate">{clip.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="開始 (秒)">
          <input type="number" step="0.1" className="dds-input w-full" value={round(clip.start)} onChange={(e) => patch({ start: Number(e.target.value) })} />
        </Field>
        <Field label="長さ (秒)">
          <input type="number" step="0.1" min="0.1" className="dds-input w-full" value={round(clip.duration)} onChange={(e) => patch({ duration: Math.max(0.1, Number(e.target.value)) })} />
        </Field>
      </div>

      {isText && (
        <>
          <Field label="テキスト">
            <input className="dds-input w-full" value={clip.text ?? ''} onChange={(e) => patch({ text: e.target.value, label: e.target.value || clip.label })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="文字サイズ">
              <input type="number" className="dds-input w-full" value={clip.fontSize ?? 40} onChange={(e) => patch({ fontSize: Number(e.target.value) })} />
            </Field>
            <Field label="文字色">
              <input type="color" className="w-full h-8 rounded bg-stage-950 border border-stage-700" value={clip.fontColor ?? '#ffffff'} onChange={(e) => patch({ fontColor: e.target.value })} />
            </Field>
          </div>
        </>
      )}

      {hasVisual && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="回転">
            <select className="dds-select w-full" value={clip.rotate ?? 0} onChange={(e) => patch({ rotate: Number(e.target.value) })}>
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
          </Field>
          <Field label="ミラー / 反転">
            <div className="flex gap-2 pt-0.5">
              <MiniToggle on={!!clip.mirror} onClick={() => patch({ mirror: !clip.mirror })}>左右</MiniToggle>
              {isVideo && <MiniToggle on={!!clip.reverse} onClick={() => patch({ reverse: !clip.reverse })}>逆再生</MiniToggle>}
            </div>
          </Field>
        </div>
      )}

      {isVideo && (
        <Field label={`速度 (${(clip.speed ?? 1).toFixed(2)}倍)`}>
          <input type="range" min="0.25" max="4" step="0.05" className="w-full accent-dream-violet"
            value={clip.speed ?? 1} onChange={(e) => patch({ speed: Number(e.target.value) })} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="フェードイン (秒)">
          <input type="number" min="0" step="0.1" className="dds-input w-full" value={clip.fadeIn ?? 0} onChange={(e) => patch({ fadeIn: Math.max(0, Number(e.target.value)) })} />
        </Field>
        <Field label="フェードアウト (秒)">
          <input type="number" min="0" step="0.1" className="dds-input w-full" value={clip.fadeOut ?? 0} onChange={(e) => patch({ fadeOut: Math.max(0, Number(e.target.value)) })} />
        </Field>
      </div>

      <Field label={`不透明度 (${clip.opacity ?? 100}%)`}>
        <input type="range" min="0" max="100" className="w-full accent-dream-violet" value={clip.opacity ?? 100} onChange={(e) => patch({ opacity: Number(e.target.value) })} />
      </Field>

      {(isAudio || isVideo) && (
        <>
          <Field label={`音量 (${clip.volume ?? 100}%)`}>
            <input type="range" min="0" max="100" className="w-full accent-dream-violet" value={clip.volume ?? 100} onChange={(e) => patch({ volume: Number(e.target.value) })} />
          </Field>
          <div className="grid grid-cols-2 gap-2 items-end">
            <Field label={`パン (${clip.pan ?? 0})`}>
              <input type="range" min="-100" max="100" className="w-full accent-dream-violet" value={clip.pan ?? 0} onChange={(e) => patch({ pan: Number(e.target.value) })} />
            </Field>
            <div className="pb-1">
              <MiniToggle on={!!clip.muted} onClick={() => patch({ muted: !clip.muted })}>ミュート</MiniToggle>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Effects() {
  const addSpecialClip = useStore((s) => s.addSpecialClip)
  return (
    <div className="p-3">
      <div className="text-[11px] text-stage-600 mb-2">クリックで再生ヘッド位置に追加</div>
      <div className="grid grid-cols-2 gap-2">
        {EFFECTS.map((e) => (
          <button
            key={e.id}
            onClick={() => addSpecialClip({ kind: 'effect', label: e.name, effectId: e.id, color: e.color, duration: 3 })}
            className="flex items-center gap-2 rounded-lg border border-stage-800 bg-stage-850 hover:border-dream-violet transition-colors p-2"
          >
            <span className="text-lg">{e.icon}</span>
            <span className="text-xs truncate">{e.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Stage() {
  const addSpecialClip = useStore((s) => s.addSpecialClip)
  return (
    <div className="p-3 space-y-4">
      <Group title="背景">
        {BACKGROUNDS.map((b) => (
          <Chip key={b} onClick={() => addSpecialClip({ kind: 'background', label: b, duration: 8, color: '#64748B' })}>{b}</Chip>
        ))}
      </Group>
      <Group title="トランジション">
        {TRANSITIONS.map((tr) => (
          <Chip key={tr} onClick={() => addSpecialClip({ kind: 'effect', label: tr, duration: 1, color: '#94A3B8' })}>{tr}</Chip>
        ))}
      </Group>
      <Group title="カメラ演出">
        {CAMERA_MOVES.map((c) => (
          <Chip key={c} onClick={() => addSpecialClip({ kind: 'camera', label: c, duration: 4, color: '#F97316' })}>{c}</Chip>
        ))}
      </Group>
    </div>
  )
}

/* --- 小物 --- */
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={'flex-1 h-9 text-xs font-medium transition-colors ' + (active ? 'text-white border-b-2 border-dream-violet' : 'text-stage-600 hover:text-white')}
    >
      {children}
    </button>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-stage-600 mb-1 block">{label}</span>
      {children}
    </label>
  )
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-stage-600 uppercase tracking-wider font-semibold mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="text-xs px-2.5 py-1 rounded-full border border-stage-700 bg-stage-850 hover:border-dream-violet hover:text-white text-stage-600 transition-colors">
      {children}
    </button>
  )
}
function MiniToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={'text-xs px-2 py-1 rounded-md border transition-colors ' + (on ? 'dream-gradient text-white border-transparent' : 'border-stage-700 text-stage-600 hover:text-white')}>
      {children}
    </button>
  )
}

function findClip(tracks: ReturnType<typeof useStore.getState>['project']['tracks'], id?: string): Clip | undefined {
  if (!id) return undefined
  for (const t of tracks) {
    const c = t.clips.find((c) => c.id === id)
    if (c) return c
  }
  return undefined
}
function round(n: number) {
  return Math.round(n * 10) / 10
}

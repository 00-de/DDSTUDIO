import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { importMedia } from '@/lib/actions'
import { MEMBERS } from '@/lib/catalog'
import { kindFromExt, getMediaDuration } from '@/lib/media'
import { getThumb } from '@/lib/thumbs'
import { allTemplates, tstyleCss } from '@/lib/textTemplates'
import { ANIM_PRESETS, applyAnimPreset } from '@/lib/animPresets'
import { FX_PRESETS, cssFilter } from '@/lib/filters'
import { EFFECTS, TRANSITIONS, BACKGROUNDS, CAMERA_MOVES } from '@/lib/catalog'

const TEMPLATES = allTemplates()
const TPL_GROUPS = Array.from(new Set(TEMPLATES.map((t) => t.group)))
import type { MediaAsset, MediaKind } from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10)

// 素材サムネイル（動画は真っ黒回避のため生成したフレームを使う）
function AssetThumb({ asset }: { asset: MediaAsset }) {
  const [thumb, setThumb] = useState<string | null>(() => getThumb(asset.id, asset.url, asset.kind))
  useEffect(() => {
    if (thumb) return
    const g = getThumb(asset.id, asset.url, asset.kind)
    if (g) { setThumb(g); return }
    const onReady = (e: Event) => {
      if ((e as CustomEvent).detail?.assetId === asset.id) {
        const v = getThumb(asset.id, asset.url, asset.kind)
        if (v) setThumb(v)
      }
    }
    window.addEventListener('dds-thumb-ready', onReady)
    return () => window.removeEventListener('dds-thumb-ready', onReady)
  }, [asset.id, thumb])

  if (thumb) return <img src={thumb} className="w-full h-full object-cover" />
  return <span className="text-2xl opacity-50">{asset.kind === 'video' ? '🎞' : '🖼'}</span>
}

const KIND_ICON: Record<MediaKind, string> = { video: '🎞', image: '🖼', audio: '🎵' }

export default function MaterialPanel({ onAutoWidth }: { onAutoWidth?: (w: number) => void }) {
  const [tab, setTab] = useState<'assets' | 'members' | 'text' | 'fx' | 'trans' | 'filter' | 'bg' | 'cam'>('assets')
  const [q, setQ] = useState('')
  const [tGroup, setTGroup] = useState('')
  const [picked, setPicked] = useState<string | null>(null)   // クリック演出中のタイル
  const [entrance, setEntrance] = useState('')                // 追加時の登場アニメ

  // テロップを追加し、選んだ登場アニメを適用
  const addTelopAnimated = (tstyle: ReturnType<typeof allTemplates>[number]['tstyle'], presetId: string) => {
    addTelop('テロップ', tstyle)
    if (!presetId) return
    const st = useStore.getState()
    let target: { id: string; clip: import('@/types').Clip } | null = null
    for (const tr of st.project.tracks) {
      for (const c of tr.clips) {
        if (c.kind !== 'lyrics' && c.kind !== 'subtitle') continue
        if (!target || c.start > target.clip.start) target = { id: c.id, clip: c }
      }
    }
    if (target) st.updateClip(target.id, { keyframes: applyAnimPreset(target.clip, presetId, 0.8) })
  }

  // タイルを押したときの共通演出（ポップ）
  const pop = (id: string) => {
    setPicked(id)
    window.setTimeout(() => setPicked((cur) => (cur === id ? null : cur)), 450)
  }
  const addTelop = useStore((st) => st.addTelop)
  const selectedClipId = useStore((st) => st.selectedClipId)
  const updateClip = useStore((st) => st.updateClip)
  const assets = useStore((s) => s.project.assets)
  const addAssets = useStore((s) => s.addAssets)
  const addClipFromAsset = useStore((s) => s.addClipFromAsset)
  const addSpecialClip = useStore((s) => s.addSpecialClip)
  const [dragOver, setDragOver] = useState(false)
  const wide = ['text','fx','trans','filter','bg','cam'].includes(tab)
  // タブを切り替えた瞬間だけ自動で広げる（手動リサイズを尊重）
  const prevTab = useRef(tab)
  useEffect(() => {
    if (prevTab.current !== tab) {
      prevTab.current = tab
      if (wide) onAutoWidth?.(470)
    }
  }, [tab, wide, onAutoWidth])

  // OS からのファイルドロップ
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = (Array.from(e.dataTransfer.files) as (File & { path?: string })[]).filter((f) => f.path)
    if (!files.length) return
    const dropped: MediaAsset[] = await Promise.all(
      files.map(async (f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
        const kind = kindFromExt(ext)
        const url = 'file:///' + encodeURI(f.path!.replace(/\\/g, '/'))
        const duration = await getMediaDuration(url, kind)
        return { id: uid(), name: f.name, path: f.path!, url, ext, kind, duration }
      })
    )
    if (dropped.length) addAssets(dropped)
  }

  return (
    <div
      className={'flex flex-col h-full w-full ' + (dragOver ? 'ring-2 ring-dream-violet ring-inset' : '')}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* タブ（アイコン+ラベルの2段グリッド） */}
      <div className="grid grid-cols-4 gap-1 p-1.5 border-b border-stage-800">
        {([
          ['assets', '🎬', 'メディア'],
          ['text', '🅣', 'テキスト'],
          ['fx', '✨', 'エフェクト'],
          ['trans', '⇄', '切替'],
          ['filter', '🎨', 'フィルタ'],
          ['bg', '🌌', '背景'],
          ['cam', '📷', 'カメラ'],
          ['members', '👥', 'メンバー'],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={'flex flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors ' +
              (tab === id ? 'dream-gradient text-white' : 'text-stage-600 hover:bg-stage-850 hover:text-dream-violet')}>
            <span className="text-[13px] leading-none">{icon}</span>
            <span className="text-[9px] leading-none whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'assets' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="p-2">
            <button
              onClick={() => importMedia()}
              className="w-full h-9 rounded-md border border-dashed border-stage-700 text-sm text-stage-600 hover:border-dream-violet hover:text-dream-violet transition-colors"
            >
              ＋ 素材を読み込む
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
            {assets.length === 0 ? (
              <div className="text-center text-xs text-stage-600 mt-8 px-4 leading-relaxed">
                ここに動画・画像・音楽を<br />ドラッグ＆ドロップ
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="group rounded-lg overflow-hidden bg-stage-850 border border-stage-800 hover:border-dream-violet cursor-pointer"
                    onClick={() => addClipFromAsset(a.id, a.kind === 'audio' ? 'audio' : a.kind === 'image' ? 'image' : 'video')}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('dds/asset', a.id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    title={`${a.name}\nクリックでタイムラインへ追加`}
                  >
                    <div className="aspect-video bg-stage-950 flex items-center justify-center overflow-hidden">
                      {a.kind === 'image' || a.kind === 'video' ? (
                        <AssetThumb asset={a} />
                      ) : (
                        <span className="text-2xl">🎵</span>
                      )}
                    </div>
                    <div className="px-1.5 py-1 flex items-center gap-1">
                      <span className="text-xs">{KIND_ICON[a.kind]}</span>
                      <span className="text-[11px] truncate text-stage-600 group-hover:text-dream-violet">{a.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) }

      {tab === 'members' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
          <div className="text-[11px] text-stage-600 px-1 mb-1">クリックでメンバー表示を配置</div>
          {MEMBERS.map((m) => (
            <button
              key={m.id}
              onClick={() =>
                addSpecialClip({
                  kind: 'subtitle',
                  label: m.name,
                  text: m.name,
                  color: m.color,
                  memberId: m.id,
                  fontColor: m.color,
                  duration: 4,
                })
              }
              className="w-full flex items-center gap-3 rounded-lg border border-stage-800 bg-stage-850 hover:border-dream-violet transition-colors p-2 text-left"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: m.color }}
              >
                {m.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{m.name}</div>
                <div className="text-[11px] text-stage-600 truncate">立ち位置: {m.position}</div>
              </div>
              <div className="ml-auto w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
            </button>
          ))}
        </div>
      )}

      {(tab === 'text' || tab === 'fx' || tab === 'trans' || tab === 'filter' || tab === 'bg' || tab === 'cam') && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="p-2 flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="検索…"
              className="dds-input flex-1 text-[12px]" />
            {tab === 'text' && (
              <select className="dds-select text-[11px] py-1 w-28" title="追加時の登場アニメ" value={entrance} onChange={(e) => setEntrance(e.target.value)}>
                <option value="">アニメなし</option>
                {ANIM_PRESETS.filter((p) => p.group === '登場').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {tab === 'text' && (
              <select className="dds-select text-[11px] py-1 w-28" value={tGroup} onChange={(e) => setTGroup(e.target.value)}>
                <option value="">すべて({TEMPLATES.length})</option>
                {TPL_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 grid grid-cols-3 gap-2 content-start">
            {tab === 'text' && TEMPLATES.filter((t) => (!q || t.name.includes(q)) && (!tGroup || t.group === tGroup)).map((t) => (
              <button key={t.id} onClick={() => { pop(t.id); addTelopAnimated(t.tstyle, entrance) }}
                className={'group rounded-lg border-2 bg-white overflow-hidden flex flex-col transition-transform duration-200 ' +
                  (picked === t.id ? 'border-dream-violet scale-105 ring-4 ring-dream-violet/40 z-10' : 'border-stage-700 hover:border-dream-violet hover:scale-[1.03]')}
                title={t.name + '（クリックで再生位置に追加）'}>
                <div className="w-full shrink-0 flex items-center justify-center px-1 overflow-hidden"
                  style={{ height: 118, background: 'linear-gradient(135deg,#241f3d,#3b2f63 55%,#4a2f5e)' }}>
                  <span className={'text-[30px] leading-none whitespace-nowrap transition-transform duration-300 ' +
                    (picked === t.id ? 'dds-pop' : 'group-hover:scale-110')}
                    style={tstyleCss(t.tstyle)}>あア</span>
                </div>
                <div className="text-[10px] text-slate-700 font-medium truncate px-1.5 py-1 bg-white border-t border-stage-700 group-hover:text-dream-violet">{t.name}</div>
              </button>
            ))}
            {tab === 'fx' && EFFECTS.filter((e) => !q || e.name.includes(q)).map((e) => (
              <button key={e.id} onClick={() => { pop(e.id); addSpecialClip({ kind: 'effect', label: e.name, effectId: e.id, color: e.color, duration: 3 }) }}
                className={'group rounded-lg border-2 bg-white overflow-hidden flex flex-col transition-transform duration-200 ' +
                  (picked === e.id ? 'border-dream-violet scale-105 ring-4 ring-dream-violet/40 z-10' : 'border-stage-700 hover:border-dream-violet hover:scale-[1.03]')}>
                <div className="w-full shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ height: 118, background: `linear-gradient(135deg, ${e.color}, ${e.color}88)` }}>
                  <span className="text-[40px] leading-none drop-shadow">{e.icon}</span>
                </div>
                <div className="text-[10px] text-slate-700 font-medium truncate px-1.5 py-1 bg-white border-t border-stage-700 group-hover:text-dream-violet">{e.name}</div>
              </button>
            ))}
            {tab === 'trans' && TRANSITIONS.filter((t) => !q || t.includes(q)).map((t) => (
              <button key={t} onClick={() => addSpecialClip({ kind: 'effect', label: t, transition: t, direction: 'both', transColor: '#000000', duration: 1, color: '#94A3B8' })}
                className="group rounded-lg border-2 border-stage-700 hover:border-dream-violet bg-white overflow-hidden flex flex-col">
                <div className="w-full shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ height: 118, background: 'linear-gradient(90deg,#1e293b 0 50%,#94a3b8 50% 100%)' }}>
                  <span className="text-[34px] leading-none text-white/90">⇄</span>
                </div>
                <div className="text-[10px] text-slate-700 font-medium truncate px-1.5 py-1 bg-white border-t border-stage-700 group-hover:text-dream-violet">{t}</div>
              </button>
            ))}
            {tab === 'bg' && BACKGROUNDS.filter((b) => !q || b.includes(q)).map((b) => (
              <button key={b} onClick={() => addSpecialClip({ kind: 'background', label: b, duration: 8, color: '#0EA5E9' })}
                className="group rounded-lg border-2 border-stage-700 hover:border-dream-violet bg-white overflow-hidden flex flex-col">
                <div className="w-full shrink-0" style={{ ...bgSwatch(b), height: 118 }} />
                <div className="text-[10px] text-slate-700 font-medium truncate px-1.5 py-1 bg-white border-t border-stage-700 group-hover:text-dream-violet">{b}</div>
              </button>
            ))}
            {tab === 'cam' && CAMERA_MOVES.filter((c) => !q || c.includes(q)).map((c) => (
              <button key={c} onClick={() => addSpecialClip({ kind: 'camera', label: c, camera: c, duration: 4, color: '#F97316' })}
                className="group rounded-lg border-2 border-stage-700 hover:border-dream-violet bg-white overflow-hidden flex flex-col">
                <div className="w-full shrink-0 flex items-center justify-center"
                  style={{ height: 118, background: 'linear-gradient(135deg,#f97316,#fbbf24)' }}>
                  <span className="text-[38px] leading-none">🎥</span>
                </div>
                <div className="text-[10px] text-slate-700 font-medium truncate px-1.5 py-1 bg-white border-t border-stage-700 group-hover:text-dream-violet">{c}</div>
              </button>
            ))}
            {tab === 'filter' && FX_PRESETS.filter((p) => !q || p.name.includes(q)).map((p) => (
              <button key={p.id}
                onClick={() => { if (!selectedClipId) { alert('先に動画・画像クリップを選んでください。'); return } updateClip(selectedClipId, { fx: { ...p.fx } }) }}
                className="group rounded-lg border-2 border-stage-700 hover:border-dream-violet bg-white overflow-hidden flex flex-col">
                <div className="w-full shrink-0 flex items-center justify-center text-[26px] font-black text-white"
                  style={{ height: 118, background: 'linear-gradient(135deg,#22d3ee,#a855f7 55%,#ec4899)', filter: cssFilter(p.fx) || undefined }}>Aa</div>
                <div className="text-[10px] text-slate-700 font-medium truncate px-1.5 py-1 bg-white border-t border-stage-700 group-hover:text-dream-violet">{p.name}</div>
              </button>
            ))}
          </div>
          <div className="text-[9px] text-stage-600 px-2 pb-2">
            {tab === 'filter' ? 'クリップを選んでからクリックで適用' : 'クリックで再生位置に追加'}
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'flex-1 h-9 text-sm font-medium transition-colors ' +
        (active ? 'text-dream-violet border-b-2 border-dream-violet' : 'text-stage-600 hover:text-dream-violet')
      }
    >
      {children}
    </button>
  )
}

// 背景名 → タイル用の見た目
function bgSwatch(label: string): React.CSSProperties {
  switch (label) {
    case '単色': return { background: '#0b0c11' }
    case 'グラデーション': return { background: 'linear-gradient(135deg,#22d3ee,#a855f7,#ec4899)' }
    case '宇宙': return { background: 'linear-gradient(180deg,#1e1b4b,#05060a)' }
    case '海': return { background: 'linear-gradient(180deg,#0ea5e9,#082f49)' }
    case '夜景': return { background: 'linear-gradient(180deg,#0f172a,#1e293b)' }
    case '桜並木': return { background: 'linear-gradient(180deg,#fbcfe8,#be185d)' }
    case 'ステージ': return { background: 'radial-gradient(circle at 50% 0%,#4c1d95,#1e1b4b 60%,#05060a)' }
    case 'ライブLED': return { background: 'linear-gradient(135deg,#7c3aed,#0b0c11)' }
    case 'スクリーン': return { background: 'linear-gradient(180deg,#e2e8f0,#94a3b8)' }
    default: return { background: 'linear-gradient(135deg,#1e1b4b,#4c1d95,#831843)' }
  }
}

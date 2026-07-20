import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { importMedia } from '@/lib/actions'
import { MEMBERS } from '@/lib/catalog'
import { kindFromExt, getMediaDuration } from '@/lib/media'
import { getThumb } from '@/lib/thumbs'
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

export default function MaterialPanel() {
  const [tab, setTab] = useState<'assets' | 'members'>('assets')
  const assets = useStore((s) => s.project.assets)
  const addAssets = useStore((s) => s.addAssets)
  const addClipFromAsset = useStore((s) => s.addClipFromAsset)
  const addSpecialClip = useStore((s) => s.addSpecialClip)
  const [dragOver, setDragOver] = useState(false)

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
      className={'flex flex-col h-full ' + (dragOver ? 'ring-2 ring-dream-violet ring-inset' : '')}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* タブ */}
      <div className="flex border-b border-stage-800">
        <TabBtn active={tab === 'assets'} onClick={() => setTab('assets')}>素材</TabBtn>
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')}>メンバー</TabBtn>
      </div>

      {tab === 'assets' ? (
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
      ) : (
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

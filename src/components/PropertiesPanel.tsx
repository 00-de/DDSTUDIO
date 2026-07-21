import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { EFFECTS, BACKGROUNDS, TRANSITIONS, CAMERA_MOVES } from '@/lib/catalog'
import type { Clip } from '@/types'
import { presetsByGroup, hasFx, type FxPreset } from '@/lib/filters'
import { ANIM_PRESETS, applyAnimPreset } from '@/lib/animPresets'
import { allTemplates, tstyleCss } from '@/lib/textTemplates'

const TEMPLATES = allTemplates()
const TPL_GROUPS = Array.from(new Set(TEMPLATES.map((t) => t.group)))

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
  const addKeyframe = useStore((s) => s.addKeyframe)
  const removeKeyframe = useStore((s) => s.removeKeyframe)
  const setAnimatedValue = useStore((s) => s.setAnimatedValue)
  const setCurrentTime = useStore((s) => s.setCurrentTime)
  const currentTime = useStore((s) => s.currentTime)
  const setName = useStore((s) => s.setName)
  const [animDur, setAnimDur] = useState(0.8)
  const [tplGroup, setTplGroup] = useState(TPL_GROUPS[0])
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
  // アニメ対象の値：キーフレームがあれば自動でキーフレーム更新、無ければ基準値を更新
  const aset = (p: Partial<Clip>) => setAnimatedValue(clip.id, p as never, currentTime - clip.start)
  const hasKf = (clip.keyframes?.length ?? 0) > 0
  const kfActive = currentTime >= clip.start && currentTime < clip.start + clip.duration
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

      {clip.transition && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="text-[11px] text-dream-violet font-semibold tracking-wider">トランジション詳細</div>
          <Field label="種類">
            <select className="dds-select w-full" value={clip.transition} onChange={(e) => patch({ transition: e.target.value, label: e.target.value })}>
              {TRANSITIONS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="方向">
              <select className="dds-select w-full" value={clip.direction ?? 'both'} onChange={(e) => patch({ direction: e.target.value as never })}>
                <option value="both">標準</option>
                <option value="in">イン</option>
                <option value="out">アウト</option>
                <option value="left">左</option>
                <option value="right">右</option>
                <option value="up">上</option>
                <option value="down">下</option>
              </select>
            </Field>
            <Field label="色">
              <input type="color" className="w-full h-8 rounded bg-white border border-stage-700" value={clip.transColor ?? '#000000'} onChange={(e) => patch({ transColor: e.target.value })} />
            </Field>
          </div>
        </div>
      )}

      {clip.camera && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="text-[11px] text-dream-violet font-semibold tracking-wider">カメラ演出</div>
          <Field label="種類">
            <select className="dds-select w-full" value={clip.camera} onChange={(e) => patch({ camera: e.target.value, label: e.target.value })}>
              {CAMERA_MOVES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      )}

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
            <select className="dds-select w-full" value={clip.rotate ?? 0} onChange={(e) => aset({ rotate: Number(e.target.value) })}>
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

      {hasVisual && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="text-[11px] text-dream-violet font-semibold tracking-wider">3D・重なり</div>
          <Field label={`3D 傾き X (${clip.rotateX ?? 0}°)`}>
            <input type="range" min="-70" max="70" className="w-full accent-dream-violet" value={clip.rotateX ?? 0} onChange={(e) => aset({ rotateX: Number(e.target.value) })} />
          </Field>
          <Field label={`3D 傾き Y (${clip.rotateY ?? 0}°)`}>
            <input type="range" min="-70" max="70" className="w-full accent-dream-violet" value={clip.rotateY ?? 0} onChange={(e) => aset({ rotateY: Number(e.target.value) })} />
          </Field>
          <Field label={`奥行き (${clip.z ?? 0}) 奥←→手前`}>
            <input type="range" min="-900" max="600" step="10" className="w-full accent-dream-violet" value={clip.z ?? 0} onChange={(e) => aset({ z: Number(e.target.value) })} />
          </Field>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stage-600">重なり順</span>
            <input type="number" className="dds-input w-16" value={clip.layer ?? 0} onChange={(e) => patch({ layer: Number(e.target.value) })} />
            <MiniToggle on={false} onClick={() => patch({ layer: (clip.layer ?? 0) + 1 })}>前面へ</MiniToggle>
            <MiniToggle on={false} onClick={() => patch({ layer: (clip.layer ?? 0) - 1 })}>背面へ</MiniToggle>
          </div>
        </div>
      )}

      {isVideo && (
        <Field label={`速度 (${(clip.speed ?? 1).toFixed(2)}倍)`}>
          <input type="range" min="0.25" max="4" step="0.05" className="w-full accent-dream-violet"
            value={clip.speed ?? 1} onChange={(e) => patch({ speed: Number(e.target.value) })} />
        </Field>
      )}

      {(hasVisual || isText) && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="X位置">
            <input type="number" step="1" className="dds-input w-full" value={Math.round(clip.x ?? 0)} onChange={(e) => aset({ x: Number(e.target.value) })} />
          </Field>
          <Field label="Y位置">
            <input type="number" step="1" className="dds-input w-full" value={Math.round(clip.y ?? 0)} onChange={(e) => aset({ y: Number(e.target.value) })} />
          </Field>
          <Field label="拡大率">
            <input type="number" step="0.05" min="0.1" max="4" className="dds-input w-full" value={round(clip.scale ?? 1)} onChange={(e) => aset({ scale: Math.max(0.1, Number(e.target.value)) })} />
          </Field>
        </div>
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
        <input type="range" min="0" max="100" className="w-full accent-dream-violet" value={clip.opacity ?? 100} onChange={(e) => aset({ opacity: Number(e.target.value) })} />
      </Field>

      {hasVisual && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-dream-violet font-semibold tracking-wider">Pan / Crop（寄り・切り抜き）</span>
            <button onClick={() => patch({ cropX: 0, cropY: 0, cropW: 100, cropH: 100 })}
              className="text-[10px] px-2 py-0.5 rounded border border-stage-700 hover:border-dream-violet">リセット</button>
          </div>
          <Field label={`左位置 X (${Math.round(clip.cropX ?? 0)}%)`}>
            <input type="range" min="0" max="95" className="w-full accent-dream-violet" value={clip.cropX ?? 0} onChange={(e) => aset({ cropX: Number(e.target.value) })} />
          </Field>
          <Field label={`上位置 Y (${Math.round(clip.cropY ?? 0)}%)`}>
            <input type="range" min="0" max="95" className="w-full accent-dream-violet" value={clip.cropY ?? 0} onChange={(e) => aset({ cropY: Number(e.target.value) })} />
          </Field>
          <Field label={`幅 W (${Math.round(clip.cropW ?? 100)}%)`}>
            <input type="range" min="5" max="100" className="w-full accent-dream-violet" value={clip.cropW ?? 100} onChange={(e) => aset({ cropW: Number(e.target.value) })} />
          </Field>
          <Field label={`高さ H (${Math.round(clip.cropH ?? 100)}%)`}>
            <input type="range" min="5" max="100" className="w-full accent-dream-violet" value={clip.cropH ?? 100} onChange={(e) => aset({ cropH: Number(e.target.value) })} />
          </Field>
          <div className="flex gap-1.5">
            <button onClick={() => aset({ cropX: 25, cropY: 25, cropW: 50, cropH: 50 })}
              className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">中央に寄る</button>
            <button onClick={() => aset({ cropX: 0, cropY: 20, cropW: 60, cropH: 60 })}
              className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">左に寄る</button>
            <button onClick={() => aset({ cropX: 40, cropY: 20, cropW: 60, cropH: 60 })}
              className="text-[10px] px-2 py-1 rounded border border-stage-700 hover:border-dream-violet flex-1">右に寄る</button>
          </div>
          <div className="text-[10px] text-stage-600">キーフレームと併用：全体表示で◆追加→先で「中央に寄る」して◆追加、で寄っていくアニメになります。</div>
        </div>
      )}

      {isText && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-dream-violet font-semibold tracking-wider">テキストテンプレート（{TEMPLATES.length}種）</span>
            {clip.tstyle && <button onClick={() => patch({ tstyle: undefined })} className="text-[10px] text-stage-600 hover:text-red-500">解除</button>}
          </div>
          <select className="dds-select w-full text-[11px]" value={tplGroup} onChange={(e) => setTplGroup(e.target.value)}>
            {TPL_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {TEMPLATES.filter((tp) => tp.group === tplGroup).map((tp) => (
              <button key={tp.id} onClick={() => patch({ tstyle: { ...tp.tstyle } })}
                className="rounded border border-stage-700 hover:border-dream-violet bg-stage-950 px-1 py-2 overflow-hidden"
                title={tp.name}>
                <span className="text-[13px] whitespace-nowrap" style={tstyleCss(tp.tstyle)}>あア A</span>
                <div className="text-[8px] text-stage-600 truncate mt-0.5">{tp.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(hasVisual || isText) && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-dream-violet font-semibold tracking-wider">かんたんアニメ（登場・退場）</span>
            <select className="dds-select text-[10px] py-0.5" value={animDur} onChange={(e) => setAnimDur(Number(e.target.value))}>
              <option value={0.4}>速い</option>
              <option value={0.8}>普通</option>
              <option value={1.5}>ゆっくり</option>
            </select>
          </div>
          <div className="text-[10px] text-stage-600">登場</div>
          <div className="grid grid-cols-3 gap-1.5">
            {ANIM_PRESETS.filter((p) => p.group === '登場').map((p) => (
              <button key={p.id}
                onClick={() => patch({ keyframes: applyAnimPreset(clip, p.id, animDur) })}
                className="text-[10px] px-1 py-1 rounded border border-stage-700 hover:border-dream-violet truncate">
                {p.name}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-stage-600">退場</div>
          <div className="grid grid-cols-3 gap-1.5">
            {ANIM_PRESETS.filter((p) => p.group === '退場').map((p) => (
              <button key={p.id}
                onClick={() => patch({ keyframes: applyAnimPreset(clip, p.id, animDur) })}
                className="text-[10px] px-1 py-1 rounded border border-stage-700 hover:border-dream-violet truncate">
                {p.name}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-stage-600">押すとキーフレームが自動で入ります（登場＋退場の組み合わせも可）。下のキーフレーム欄で確認・削除できます。</div>
        </div>
      )}

      {(hasVisual || isText) && (
        <div className="space-y-2 rounded-lg border border-stage-800 p-2 bg-stage-850">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-dream-violet font-semibold tracking-wider">キーフレーム（アニメ）</span>
            <button
              onClick={() => addKeyframe(clip.id, currentTime - clip.start)}
              disabled={!kfActive}
              className="text-[11px] px-2 py-1 rounded-md dream-gradient text-white font-semibold hover:brightness-110 disabled:opacity-40"
              title={kfActive ? '再生位置に現在の値を記録' : '再生ヘッドをこのクリップの範囲に合わせてください'}
            >
              ◆ 再生位置に追加
            </button>
          </div>
          {!hasKf ? (
            <div className="text-[10px] text-stage-600 leading-relaxed">
              使い方：値（位置・サイズ・回転・不透明度など）を決めて「◆ 再生位置に追加」→ 再生ヘッドを別の時刻へ移動 → 値を変えてまた追加。間が自動でアニメーションします。書き出しにも反映されます。
            </div>
          ) : (
            <div className="space-y-1">
              {clip.keyframes!.map((k) => {
                const atThis = Math.abs(currentTime - clip.start - k.time) < 0.05
                return (
                  <div key={k.id} className={'flex items-center gap-2 text-[11px] rounded px-2 py-1 ' + (atThis ? 'bg-dream-violet/20 ring-1 ring-dream-violet' : 'bg-stage-950')}>
                    <button onClick={() => setCurrentTime(clip.start + k.time)} className="text-dream-violet hover:underline tabular-nums">
                      ◆ {k.time.toFixed(2)}s
                    </button>
                    <button onClick={() => removeKeyframe(clip.id, k.id)} className="ml-auto text-stage-600 hover:text-red-500">削除</button>
                  </div>
                )
              })}
              <div className="text-[10px] text-stage-600 pt-1">◆をクリックでその時刻へ移動。値を変えると自動でそのキーフレームが更新されます。</div>
            </div>
          )}
        </div>
      )}

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
  const selectedId = useStore((s) => s.selectedClipId)
  const project = useStore((s) => s.project)
  const updateClip = useStore((s) => s.updateClip)

  let clip: Clip | undefined
  for (const tr of project.tracks) { const c = tr.clips.find((c) => c.id === selectedId); if (c) { clip = c; break } }
  const isVisual = clip && (clip.kind === 'video' || clip.kind === 'image')
  const groups = presetsByGroup()
  const fx = clip?.fx ?? {}
  const setFx = (patch: Partial<NonNullable<Clip['fx']>>) => { if (clip) updateClip(clip.id, { fx: { ...fx, ...patch } }) }
  const applyPreset = (p: FxPreset) => { if (clip) updateClip(clip.id, { fx: { ...p.fx } }) }

  return (
    <div className="p-3 space-y-4">
      {/* 色補正・光フィルター（選択クリップに適用） */}
      {isVisual ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-dream-violet font-semibold tracking-wider">色補正・光フィルター</span>
            {hasFx(fx) && <button onClick={() => clip && updateClip(clip.id, { fx: {} })} className="text-[10px] text-stage-600 hover:text-red-500">解除</button>}
          </div>
          {Object.entries(groups).map(([group, presets]) => (
            <div key={group}>
              <div className="text-[10px] text-stage-600 mb-1">{group}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {presets.map((p) => (
                  <button key={p.id} onClick={() => applyPreset(p)}
                    className="text-[10px] px-1.5 py-1 rounded border border-stage-700 hover:border-dream-violet truncate">
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <details className="border-t border-stage-800 pt-2">
            <summary className="text-[11px] text-stage-600 cursor-pointer hover:text-dream-violet">手動で微調整</summary>
            <div className="space-y-1.5 mt-2">
              <FxSlider label="明るさ" v={fx.brightness ?? 100} min={0} max={200} def={100} on={(v) => setFx({ brightness: v })} />
              <FxSlider label="コントラスト" v={fx.contrast ?? 100} min={0} max={200} def={100} on={(v) => setFx({ contrast: v })} />
              <FxSlider label="彩度" v={fx.saturate ?? 100} min={0} max={300} def={100} on={(v) => setFx({ saturate: v })} />
              <FxSlider label="色相" v={fx.hue ?? 0} min={0} max={360} def={0} on={(v) => setFx({ hue: v })} />
              <FxSlider label="セピア" v={fx.sepia ?? 0} min={0} max={100} def={0} on={(v) => setFx({ sepia: v })} />
              <FxSlider label="白黒" v={fx.grayscale ?? 0} min={0} max={100} def={0} on={(v) => setFx({ grayscale: v })} />
              <FxSlider label="ぼかし" v={fx.blur ?? 0} min={0} max={30} def={0} on={(v) => setFx({ blur: v })} />
              <FxSlider label="グロー(発光)" v={fx.glow ?? 0} min={0} max={100} def={0} on={(v) => setFx({ glow: v })} />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stage-600 flex-1">グロー色</span>
                <input type="color" value={fx.glowColor ?? '#ffffff'} onChange={(e) => setFx({ glowColor: e.target.value })} className="w-7 h-6 rounded bg-white border border-stage-700" />
              </div>
              <FxSlider label="周辺減光" v={fx.vignette ?? 0} min={0} max={100} def={0} on={(v) => setFx({ vignette: v })} />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stage-600 flex-1">色被せ</span>
                <input type="color" value={fx.tint ?? '#ffffff'} onChange={(e) => setFx({ tint: e.target.value })} className="w-7 h-6 rounded bg-white border border-stage-700" />
              </div>
              <FxSlider label="色被せ量" v={fx.tintAmount ?? 0} min={0} max={100} def={0} on={(v) => setFx({ tintAmount: v })} />
            </div>
          </details>
        </div>
      ) : (
        <div className="text-[11px] text-stage-600 rounded-lg border border-dashed border-stage-700 p-3 text-center">
          動画・画像クリップを選ぶと、色補正・光フィルターをかけられます。
        </div>
      )}

      {/* パーティクル演出（クリップとして追加） */}
      <div className="border-t border-stage-800 pt-3">
        <div className="text-[11px] text-stage-600 mb-2">粒子エフェクト（再生ヘッド位置に追加）</div>
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
    </div>
  )
}

function FxSlider({ label, v, min, max, def, on }: { label: string; v: number; min: number; max: number; def: number; on: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-stage-600">
        <span>{label}</span>
        <button onClick={() => on(def)} className={'tabular-nums ' + (v !== def ? 'text-dream-violet' : '')}>{v}</button>
      </div>
      <input type="range" min={min} max={max} value={v} onChange={(e) => on(Number(e.target.value))} className="w-full accent-dream-violet" />
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
          <Chip key={tr} onClick={() => addSpecialClip({ kind: 'effect', label: tr, transition: tr, direction: 'both', transColor: '#000000', duration: 1, color: '#94A3B8' })}>{tr}</Chip>
        ))}
      </Group>
      <Group title="カメラ演出">
        {CAMERA_MOVES.map((c) => (
          <Chip key={c} onClick={() => addSpecialClip({ kind: 'camera', label: c, camera: c, duration: 4, color: '#F97316' })}>{c}</Chip>
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
      className={'flex-1 h-9 text-xs font-medium transition-colors ' + (active ? 'text-dream-violet border-b-2 border-dream-violet' : 'text-stage-600 hover:text-dream-violet')}
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
    <button onClick={onClick} className="text-xs px-2.5 py-1 rounded-full border border-stage-700 bg-stage-850 hover:border-dream-violet hover:text-dream-violet text-stage-600 transition-colors">
      {children}
    </button>
  )
}
function MiniToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={'text-xs px-2 py-1 rounded-md border transition-colors ' + (on ? 'dream-gradient text-white border-transparent' : 'border-stage-700 text-stage-600 hover:text-dream-violet')}>
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

import { useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'
import { loadConfig, saveConfig, parseConfig, clearConfig, isConfigured } from '@/lib/firebase'
import { joinRoom, leaveRoom } from '@/lib/collab'

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{room}/{document=**} {
      allow read, write: if true;
    }
  }
}`

export default function CollabModal() {
  const close = () => useStore.getState().openModal(null)
  const collabOn = useStore((s) => s.collabOn)
  const collabRoom = useStore((s) => s.collabRoom)
  const peers = useStore((s) => s.peers)
  const project = useStore((s) => s.project)

  const [step, setStep] = useState<'setup' | 'join'>(isConfigured() ? 'join' : 'setup')
  const [cfgText, setCfgText] = useState('')
  const [room, setRoom] = useState(localStorage.getItem('dds.room') || '')
  const [name, setName] = useState(localStorage.getItem('dds.name') || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const applyConfig = () => {
    const cfg = parseConfig(cfgText)
    if (!cfg) { setMsg({ ok: false, text: '設定を読み取れませんでした。Firebase コンソールの firebaseConfig をそのまま貼り付けてください。' }); return }
    saveConfig(cfg)
    setMsg({ ok: true, text: `プロジェクト「${cfg.projectId}」を登録しました。` })
    setStep('join')
  }

  const doJoin = async () => {
    if (!room.trim() || !name.trim()) { setMsg({ ok: false, text: 'ルーム名とあなたの名前を入力してください。' }); return }
    setBusy(true); setMsg(null)
    localStorage.setItem('dds.room', room.trim())
    localStorage.setItem('dds.name', name.trim())
    const r = await joinRoom({ room: room.trim(), name: name.trim() })
    setBusy(false)
    if (r.ok) setMsg({ ok: true, text: `ルーム「${room}」に参加しました。編集がリアルタイムで共有されます。` })
    else setMsg({ ok: false, text: r.error ?? '参加に失敗しました。' })
  }

  const doLeave = async () => {
    setBusy(true)
    await leaveRoom()
    setBusy(false)
    setMsg({ ok: true, text: '共同編集を終了しました。' })
  }

  const doRelink = async () => {
    const names = project.assets.map((a) => a.name)
    if (names.length === 0) { setMsg({ ok: false, text: '素材がありません。' }); return }
    setBusy(true)
    const r = await window.dds.relinkMedia(names)
    setBusy(false)
    if (!r.ok || !r.found) { if (!r.canceled) setMsg({ ok: false, text: 'フォルダを読めませんでした。' }); return }
    const found = r.found
    let n = 0
    useStore.setState((s) => {
      const p = JSON.parse(JSON.stringify(s.project))
      for (const a of p.assets) {
        const hit = found[a.name.toLowerCase()]
        if (hit) { a.path = hit.path; a.url = hit.url; n++ }
      }
      return { project: p }
    })
    setMsg({ ok: n > 0, text: `${n} / ${names.length} 件の素材をこのPCのファイルに接続しました。` })
  }

  return (
    <ModalShell title="チームで同時編集" onClose={busy ? () => {} : close} wide>
      {/* 接続状態 */}
      {collabOn && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ルーム「{collabRoom}」で編集中 ・ 参加者 {peers.length + 1}人
          </div>
          {peers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {peers.map((p) => (
                <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: p.color }}>
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {step === 'setup' ? (
          <>
            <div className="text-[11px] text-stage-600 leading-relaxed rounded-lg bg-stage-850 border border-stage-800 p-3">
              <b className="text-dream-violet">初回のみ設定</b><br />
              1. Firebase コンソールでプロジェクトを作成<br />
              2. 「Firestore Database」を作成（テストモードでOK）<br />
              3. プロジェクトの設定 → マイアプリ →「ウェブ」を追加<br />
              4. 表示される <b>firebaseConfig</b> をまるごと下に貼り付け
            </div>
            <label className="block">
              <span className="text-[11px] text-stage-600 mb-1 block">firebaseConfig を貼り付け</span>
              <textarea
                rows={7} value={cfgText} onChange={(e) => setCfgText(e.target.value)}
                placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "xxx.firebaseapp.com",\n  projectId: "xxx",\n  appId: "..."\n};'}
                className="w-full dds-input resize-none font-mono text-[11px] leading-relaxed"
              />
            </label>
            <details className="text-[11px] text-stage-600">
              <summary className="cursor-pointer hover:text-dream-violet">Firestore のルール（コピーして貼り付け）</summary>
              <pre className="mt-2 p-2 bg-stage-950 rounded border border-stage-800 overflow-x-auto text-[10px]">{RULES}</pre>
              <div className="mt-1">※ 誰でも読み書きできる設定です。身内のみで使ってください。</div>
            </details>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] text-stage-600 mb-1 block">ルーム名（全員で同じ名前に）</span>
                <input className="dds-input w-full" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="例: asunokaze-mv" disabled={collabOn} />
              </label>
              <label className="block">
                <span className="text-[11px] text-stage-600 mb-1 block">あなたの名前</span>
                <input className="dds-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: トシ" disabled={collabOn} />
              </label>
            </div>

            <div className="rounded-lg bg-stage-850 border border-stage-800 p-3 text-[11px] text-stage-600 leading-relaxed">
              <b className="text-dream-violet">素材について</b>：動画はクラウドに送らず、<b>各自のPCにある同じファイル</b>を使います。参加したら「素材を接続」で、素材が入っているフォルダを指定してください（ファイル名で自動照合します）。<br />
              最初にルームを作った人のプロジェクトが土台になります。
            </div>

            <div className="flex items-center gap-2">
              <button onClick={doRelink} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-md border border-stage-700 text-stage-600 hover:border-dream-violet hover:text-dream-violet disabled:opacity-40">
                素材を接続（フォルダ指定）
              </button>
              <button onClick={() => { clearConfig(); setStep('setup'); setMsg(null) }} disabled={collabOn || busy}
                className="text-xs px-3 py-1.5 rounded-md border border-stage-700 text-stage-600 hover:text-red-500 disabled:opacity-40">
                Firebase 設定を変更
              </button>
              <span className="text-[10px] text-stage-600 ml-auto">{loadConfig()?.projectId}</span>
            </div>
          </>
        )}

        {msg && (
          <div className={'text-sm rounded-lg p-3 ' + (msg.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500')}>
            {msg.text}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={close} disabled={busy} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600 disabled:opacity-40">閉じる</button>
        {step === 'setup' ? (
          <button onClick={applyConfig} className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow">設定を保存</button>
        ) : collabOn ? (
          <button onClick={doLeave} disabled={busy} className="px-5 py-2 rounded-md border border-red-400 text-red-500 hover:bg-red-500/10 font-semibold disabled:opacity-40">共同編集を終了</button>
        ) : (
          <button onClick={doJoin} disabled={busy} className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow disabled:opacity-60">
            {busy ? '接続中…' : 'ルームに参加'}
          </button>
        )}
      </div>
    </ModalShell>
  )
}

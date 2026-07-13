import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'

export default function SettingsModal() {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const close = () => useStore.getState().openModal(null)

  return (
    <ModalShell title="環境設定" onClose={close}>
      <div className="space-y-5">
        <Row label="自動保存">
          <select
            className="dds-select"
            value={settings.autoSaveMinutes}
            onChange={(e) => update({ autoSaveMinutes: Number(e.target.value) })}
          >
            <option value={1}>1分ごと</option>
            <option value={3}>3分ごと</option>
            <option value={5}>5分ごと</option>
            <option value={10}>10分ごと</option>
          </select>
        </Row>

        <Row label="GPUアクセラレーション" desc="レンダリングを高速化します（要再起動）">
          <Toggle value={settings.gpuAcceleration} onChange={(v) => update({ gpuAcceleration: v })} />
        </Row>

        <Row label="テーマ">
          <select className="dds-select" value={settings.theme} onChange={(e) => update({ theme: e.target.value as never })}>
            <option value="stage">ステージ（既定）</option>
            <option value="dark">ダーク</option>
          </select>
        </Row>

        <Row label="キャッシュ削除" desc="プレビュー用の一時ファイルを削除します">
          <button
            onClick={() => {
              try { localStorage.removeItem('dds.cache') } catch { /* noop */ }
              alert('キャッシュを削除しました。')
            }}
            className="text-sm px-3 py-1 rounded-md border border-stage-700 hover:border-dream-violet"
          >
            削除
          </button>
        </Row>

        <div className="text-[11px] text-stage-600 pt-2 border-t border-stage-800 leading-relaxed">
          設定はこの端末に保存されます。保存先やフォント設定などの詳細項目は今後のバージョンで追加予定です。
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={close} className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110">
          閉じる
        </button>
      </div>
    </ModalShell>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-[11px] text-stage-600 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={'relative w-11 h-6 rounded-full transition-colors ' + (value ? 'dream-gradient' : 'bg-stage-700')}
    >
      <motion.div layout className="absolute top-0.5 w-5 h-5 rounded-full bg-white" style={{ left: value ? 22 : 2 }} />
    </button>
  )
}

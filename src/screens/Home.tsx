import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { openProject, openRecent } from '@/lib/actions'

const TEMPLATES = [
  { id: 'mv', name: 'MV制作', desc: '楽曲に合わせたミュージックビデオ', icon: '🎬' },
  { id: 'live', name: 'ライブ映像', desc: 'ステージ演出・スクリーン映像', icon: '🎤' },
  { id: 'intro', name: 'オープニング', desc: 'ライブ開演前の導入映像', icon: '✨' },
  { id: 'member', name: 'メンバー紹介', desc: '5人のメンバー紹介ムービー', icon: '⭐' },
]

export default function Home() {
  const { createProject, recent, openModal } = useStore()

  return (
    <div className="h-full w-full overflow-y-auto bg-stage-950">
      {/* ヒーロー */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 dream-gradient opacity-20 blur-3xl" />
        <div className="relative px-12 pt-16 pb-10">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-xs tracking-[0.4em] text-dream-cyan font-semibold mb-3">
              DAYDREAM PLUS — LIVE VISUAL STUDIO
            </div>
            <h1 className="text-6xl font-black leading-none">
              <span className="dream-text">DayDream</span>{' '}
              <span className="text-slate-800">Studio</span>
            </h1>
            <p className="mt-4 text-stage-600 max-w-lg">
              ライブ・MV・スクリーン映像・歌詞演出に特化した、DayDreamプラス専用の映像編集ソフト。
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-12 pb-16 max-w-6xl">
        {/* クイックアクション */}
        <div className="grid grid-cols-4 gap-4 mt-2">
          <ActionCard
            title="新規プロジェクト"
            sub="まっさらな状態から作成"
            icon="＋"
            primary
            onClick={() => createProject()}
          />
          <ActionCard title="プロジェクトを開く" sub=".ddproject を読み込む" icon="📂" onClick={() => openProject()} />
          <ActionCard title="テンプレート" sub="用途から選んで開始" icon="🗂" onClick={() => createProject('新規（テンプレート）')} />
          <ActionCard title="設定" sub="保存先・GPU・自動保存" icon="⚙️" onClick={() => { createProject('設定確認用'); openModal('settings') }} />
        </div>

        {/* テンプレート */}
        <SectionTitle>テンプレート</SectionTitle>
        <div className="grid grid-cols-4 gap-4">
          {TEMPLATES.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => createProject(t.name)}
              className="text-left rounded-xl border border-stage-800 bg-stage-900 hover:border-dream-violet hover:shadow-glow transition-all p-4 group"
            >
              <div className="text-3xl mb-3">{t.icon}</div>
              <div className="font-semibold group-hover:text-dream-violet transition-colors">{t.name}</div>
              <div className="text-xs text-stage-600 mt-1">{t.desc}</div>
            </motion.button>
          ))}
        </div>

        {/* 最近使用 */}
        <SectionTitle>最近使用したプロジェクト</SectionTitle>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stage-800 p-8 text-center text-stage-600 text-sm">
            まだ履歴がありません。新規プロジェクトから始めましょう。
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <button
                key={r.path}
                onClick={() => openRecent(r.path)}
                className="w-full flex items-center gap-3 rounded-lg border border-stage-800 bg-stage-900 hover:border-dream-violet/60 transition-colors px-4 py-3 text-left"
              >
                <div className="w-9 h-9 rounded-md dream-gradient flex items-center justify-center text-white font-bold shrink-0">
                  {r.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-stage-600 truncate">{r.path}</div>
                </div>
                <div className="ml-auto text-xs text-stage-600">{new Date(r.at).toLocaleDateString('ja-JP')}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-stage-600 mt-10 mb-3 tracking-wide">{children}</h2>
}

function ActionCard({
  title,
  sub,
  icon,
  onClick,
  primary,
}: {
  title: string
  sub: string
  icon: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={
        'text-left rounded-xl p-5 transition-all ' +
        (primary
          ? 'dream-gradient text-white shadow-glow hover:brightness-110'
          : 'border border-stage-800 bg-stage-900 hover:border-dream-violet')
      }
    >
      <div className="text-2xl mb-3">{icon}</div>
      <div className="font-bold">{title}</div>
      <div className={'text-xs mt-1 ' + (primary ? 'text-white/80' : 'text-stage-600')}>{sub}</div>
    </button>
  )
}

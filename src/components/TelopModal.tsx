import { useState } from 'react'
import { useStore } from '@/store/useStore'
import ModalShell from '@/components/ModalShell'

export default function TelopModal() {
  const { addTelop, addTelopLines, openModal } = useStore()
  const close = () => openModal(null)
  const [text, setText] = useState('')
  const [perLine, setPerLine] = useState(3)

  const lineCount = text.split('\n').map((l) => l.trim()).filter(Boolean).length

  return (
    <ModalShell title="テロップ・歌詞を追加" onClose={close} wide>
      <div className="space-y-4">
        <div>
          <div className="text-[11px] text-stage-600 mb-1 font-semibold tracking-wider">テキスト（改行で複数行）</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'例）\n君と見た夕焼け\n忘れないよ\nずっと'}
            className="w-full dds-input resize-none leading-relaxed"
          />
          <div className="text-[11px] text-stage-600 mt-1">{lineCount} 行</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stage-600">1行あたりの表示時間</span>
          <select className="dds-select" value={perLine} onChange={(e) => setPerLine(Number(e.target.value))}>
            <option value={2}>2秒</option>
            <option value={3}>3秒</option>
            <option value={4}>4秒</option>
            <option value={5}>5秒</option>
          </select>
        </div>

        <div className="rounded-lg bg-stage-900 border border-stage-800 p-3 text-[11px] text-stage-600 leading-relaxed">
          「1つ配置」＝再生ヘッド位置に1つのテロップを追加（プレビュー上でドラッグ移動・ダブルクリックで文字編集）。<br />
          「各行を流す」＝改行ごとに歌詞クリップを順番に並べます（歌詞用）。
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={close} className="px-4 py-2 rounded-md border border-stage-700 hover:border-stage-600">キャンセル</button>
        <button
          onClick={() => { addTelop(text.split('\n')[0]?.trim() || 'テロップ'); close() }}
          className="px-5 py-2 rounded-md border border-dream-violet text-dream-violet hover:bg-dream-violet/10 font-semibold"
        >
          1つ配置
        </button>
        <button
          onClick={() => { if (lineCount > 0) { addTelopLines(text, perLine); close() } }}
          disabled={lineCount === 0}
          className="px-5 py-2 rounded-md dream-gradient text-white font-semibold hover:brightness-110 shadow-glow disabled:opacity-50"
        >
          各行を流す（{lineCount}行）
        </button>
      </div>
    </ModalShell>
  )
}

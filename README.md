# DayDream Studio Ver.1.0

DayDreamプラス専用 ライブ演出映像編集ソフト（Windows デスクトップアプリ）。

このプロジェクトは **ターミナル不要**。GitHub Desktop で push すると、
GitHub Actions が自動で Windows 用 `.exe`（インストーラー）をビルドします。

---

## 使い方（ターミナルなし・GUIだけ）

### ① GitHub にリポジトリを作る
1. ブラウザで GitHub にログイン →「New repository」
2. 名前は `daydream-studio` など。Public / Private どちらでもOK
3. 「Create repository」

### ② GitHub Desktop でこのフォルダを入れる
1. GitHub Desktop で作ったリポジトリを **Clone**（ローカルに空フォルダができる）
2. この zip を展開し、**中身をすべて** そのフォルダにドラッグ＆ドロップ
   （`node_modules` は入っていません。入れる必要もありません）
3. GitHub Desktop に変更がずらっと表示される
4. 左下に「Summary」を入力（例: `first commit`）→ **Commit to main**
5. 右上の **Push origin** を押す

### ③ 自動で .exe がビルドされる
1. ブラウザで自分のリポジトリを開く → 上部の **Actions** タブ
2. 「Build Windows App」が実行中（黄色→緑になれば成功。約3〜6分）
3. 緑になったらそのビルドをクリック
4. 下の **Artifacts** の `DayDreamStudio-Windows` をクリックしてダウンロード
5. zip を展開すると `DayDreamStudio-Setup-1.0.0.exe` が入っている
6. これを実行するとインストール完了 🎉

> バージョンを上げて配布したいときは、GitHub の「Releases」からタグ
> （例: `v1.0.0`）を付けると、`.exe` 付きのリリースも自動作成されます。

---

## できること（Ver.1.0）

- ホーム画面（新規／開く／最近使用／テンプレート／設定）
- 素材の読み込み（動画・画像・音楽をドラッグ＆ドロップ）
- 9本のマルチトラック タイムライン（動画・画像・背景・エフェクト・歌詞・字幕・カメラ・照明・音楽）
- クリップのドラッグ移動・分割・複製・削除
- リアルタイムプレビュー（映像＋歌詞＋エフェクト合成表示）
- DayDreamプラス メンバー5人のワンクリック配置（悠真・葵・蓮・結衣・大地）
- エフェクト16種／背景11種／トランジション9種／カメラ演出8種
- プロパティ編集（テキスト・文字色・サイズ・不透明度・音量など）
- 元に戻す／やり直し（最大50段階）
- キーボードショートカット（仕様書準拠）
- プロジェクト保存・読み込み（`.ddproject`）
- **書き出し**：動画トラックを連結して MP4 等に出力（FFmpeg内蔵）

## 今後のバージョンで対応予定

- 歌詞・エフェクト・カメラ演出を「合成」した書き出し
- LRC歌詞の自動スクロール、手ぶれ補正・色補正などの映像フィルタ
- 仕様書 Ver.2.0（AI編集）／ Ver.3.0（ライブ演出自動生成）

---

## 開発メモ（技術者向け）

- Electron + React + TypeScript + Vite + Tailwind + Framer Motion
- 状態管理: zustand ／ 書き出し: ffmpeg-static
- ビルド: `npm run dist`（GitHub Actions の windows-latest 上で実行）
- ローカルで試す場合のみ: `npm install` → `npm run dev`

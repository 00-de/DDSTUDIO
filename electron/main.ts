import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// dist-electron/main.js を基準にしたパス解決
process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null

// ---- FFmpeg のパス解決（パッケージ後は asar.unpacked を参照）----
function resolveFfmpegPath(): string {
  // ffmpeg-static はバイナリへの絶対パスを default export する。
  // パッケージ後は asar 内ではなく asar.unpacked を参照する必要がある。
  const p = (ffmpegStatic as unknown as string) || ''
  if (!p) return ''
  return p.replace('app.asar', 'app.asar.unpacked')
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#0B0C11',
    show: false,
    autoHideMenuBar: true,
    title: 'DayDream Studio',
    icon: path.join(process.env.APP_ROOT!, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => win?.show())

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // 外部リンクは既定ブラウザで開く
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null) // 独自メニューバーを React 側に持たせる
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

/* =========================================================
 *  IPC ハンドラ
 * ======================================================= */

// アプリ情報
ipcMain.handle('app:getVersion', () => app.getVersion())

// 素材のインポート（複数選択可）
ipcMain.handle('dialog:importMedia', async () => {
  if (!win) return []
  const res = await dialog.showOpenDialog(win, {
    title: '素材を読み込む',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'すべての素材', extensions: ['mp4', 'mov', 'avi', 'webm', 'gif', 'png', 'jpg', 'jpeg', 'svg', 'mp3', 'wav', 'aac', 'flac'] },
      { name: '動画', extensions: ['mp4', 'mov', 'avi', 'webm'] },
      { name: '画像', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] },
      { name: '音声', extensions: ['mp3', 'wav', 'aac', 'flac'] },
    ],
  })
  if (res.canceled) return []
  return res.filePaths.map((p) => ({
    path: p,
    name: path.basename(p),
    ext: path.extname(p).slice(1).toLowerCase(),
    url: pathToFileURL(p).href,
  }))
})

// プロジェクト保存
ipcMain.handle('project:save', async (_e, payload: { data: string; filePath?: string }) => {
  let target = payload.filePath
  if (!target && win) {
    const res = await dialog.showSaveDialog(win, {
      title: 'プロジェクトを保存',
      defaultPath: 'MyProject.ddproject',
      filters: [{ name: 'DayDream Project', extensions: ['ddproject'] }],
    })
    if (res.canceled || !res.filePath) return { ok: false }
    target = res.filePath
  }
  if (!target) return { ok: false }
  try {
    fs.writeFileSync(target, payload.data, 'utf-8')
    return { ok: true, filePath: target }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// プロジェクトを開く
ipcMain.handle('project:open', async () => {
  if (!win) return { ok: false }
  const res = await dialog.showOpenDialog(win, {
    title: 'プロジェクトを開く',
    properties: ['openFile'],
    filters: [{ name: 'DayDream Project', extensions: ['ddproject'] }],
  })
  if (res.canceled || res.filePaths.length === 0) return { ok: false }
  try {
    const data = fs.readFileSync(res.filePaths[0], 'utf-8')
    return { ok: true, filePath: res.filePaths[0], data }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// 指定パスからプロジェクト読み込み（最近使用したファイル用）
ipcMain.handle('project:openPath', async (_e, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'ファイルが見つかりません' }
    const data = fs.readFileSync(filePath, 'utf-8')
    return { ok: true, filePath, data }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// 書き出し（Ver.1.0: メイン動画トラックのクリップを連結して MP4 出力）
ipcMain.handle('export:video', async (_e, opts: {
  clips: { path: string }[]
  format: string
  resolution: string
  fps: number
}) => {
  if (!win) return { ok: false }
  const ffmpeg = resolveFfmpegPath()
  if (!ffmpeg || !fs.existsSync(ffmpeg)) {
    return { ok: false, error: 'FFmpeg が見つかりませんでした。' }
  }
  if (!opts.clips || opts.clips.length === 0) {
    return { ok: false, error: '書き出す動画クリップがありません。' }
  }

  const res = await dialog.showSaveDialog(win, {
    title: '動画を書き出す',
    defaultPath: `export.${opts.format}`,
    filters: [{ name: opts.format.toUpperCase(), extensions: [opts.format] }],
  })
  if (res.canceled || !res.filePath) return { ok: false, canceled: true }

  const outPath = res.filePath
  const heightMap: Record<string, number> = { '720p': 720, '1080p': 1080, '2k': 1440, '4k': 2160 }
  const h = heightMap[opts.resolution] ?? 1080

  // concat 用の一時ファイルリスト
  const listFile = path.join(app.getPath('temp'), `dds_concat_${Date.now()}.txt`)
  const listBody = opts.clips.map((c) => `file '${c.path.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(listFile, listBody, 'utf-8')

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-vf', `scale=-2:${h},fps=${opts.fps}`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    outPath,
  ]

  return await new Promise((resolve) => {
    const proc = spawn(ffmpeg, args)
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
      // 進捗を renderer に送る
      win?.webContents.send('export:progress', d.toString())
    })
    proc.on('close', (code) => {
      try { fs.unlinkSync(listFile) } catch { /* noop */ }
      if (code === 0) resolve({ ok: true, filePath: outPath })
      else resolve({ ok: false, error: `FFmpeg 終了コード ${code}\n${stderr.slice(-500)}` })
    })
    proc.on('error', (err) => resolve({ ok: false, error: String(err) }))
  })
})

// 書き出し先フォルダを開く
ipcMain.handle('shell:showInFolder', (_e, filePath: string) => {
  shell.showItemInFolder(filePath)
})

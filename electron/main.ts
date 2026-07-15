import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'
import updaterPkg from 'electron-updater'

const { autoUpdater } = updaterPkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// dist-electron/main.js を基準にしたパス解決
process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

let win: BrowserWindow | null = null
let splash: BrowserWindow | null = null

// ---- FFmpeg のパス解決（パッケージ後は asar.unpacked を参照）----
function resolveFfmpegPath(): string {
  // ffmpeg-static はバイナリへの絶対パスを default export する。
  // パッケージ後は asar 内ではなく asar.unpacked を参照する必要がある。
  const p = (ffmpegStatic as unknown as string) || ''
  if (!p) return ''
  return p.replace('app.asar', 'app.asar.unpacked')
}

function createSplash() {
  splash = new BrowserWindow({
    width: 460,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  // dist-electron/main.js から見た splash.html の場所
  const splashPath = app.isPackaged
    ? path.join(process.env.APP_ROOT!, 'dist-electron', 'splash.html')
    : path.join(__dirname, '..', 'electron', 'splash.html')
  splash.loadFile(splashPath, { query: { v: app.getVersion() } }).catch(() => {})
  splash.once('ready-to-show', () => splash?.show())
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#F3F0FF',
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

  // 準備できたらスプラッシュを閉じてメインを表示（最低1.2秒は見せる）
  const startedAt = Date.now()
  win.once('ready-to-show', () => {
    const wait = Math.max(0, 1200 - (Date.now() - startedAt))
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) { splash.close(); splash = null }
      win?.show()
      win?.focus()
    }, wait)
  })

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
  createSplash()
  createWindow()
  setupAutoUpdate()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 自動アップデート（インストール版のみ動作）
function setupAutoUpdate() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', async (info) => {
    if (!win) return
    const res = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['今すぐ再起動して更新', 'あとで'],
      defaultId: 0,
      cancelId: 1,
      title: 'アップデート',
      message: `新しいバージョン ${info.version} が利用可能です`,
      detail: '再起動すると更新が適用されます。',
    })
    if (res.response === 0) autoUpdater.quitAndInstall()
  })

  autoUpdater.on('error', (err) => console.error('自動更新エラー:', err))

  // 起動時に確認（数秒待ってウィンドウ表示後に）
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000)
}

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

// 利用可能なGPUエンコーダを検出（NVIDIA > AMD > Intel > CPU）
let cachedEncoder: string | null = null
async function detectEncoder(ffmpeg: string): Promise<string> {
  if (cachedEncoder) return cachedEncoder
  const list: string = await new Promise((resolve) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-encoders'])
    let out = ''
    p.stdout.on('data', (d) => (out += d.toString()))
    p.on('close', () => resolve(out))
    p.on('error', () => resolve(''))
  })
  const prefer = ['h264_nvenc', 'h264_amf', 'h264_qsv']
  cachedEncoder = prefer.find((e) => list.includes(e)) ?? 'libx264'
  return cachedEncoder
}

ipcMain.handle('export:detectEncoder', async () => {
  const ffmpeg = resolveFfmpegPath()
  if (!ffmpeg || !fs.existsSync(ffmpeg)) return 'libx264'
  return await detectEncoder(ffmpeg)
})

// エンコーダ別の引数（GPU優先・高速設定）
function encoderArgs(enc: string, quality: 'fast' | 'balanced' | 'quality') {
  switch (enc) {
    case 'h264_nvenc':
      return ['-c:v', 'h264_nvenc', '-preset', quality === 'fast' ? 'p1' : quality === 'quality' ? 'p6' : 'p4',
        '-rc', 'vbr', '-cq', quality === 'quality' ? '19' : '23', '-pix_fmt', 'yuv420p']
    case 'h264_amf':
      return ['-c:v', 'h264_amf', '-quality', quality === 'fast' ? 'speed' : 'balanced', '-pix_fmt', 'yuv420p']
    case 'h264_qsv':
      return ['-c:v', 'h264_qsv', '-preset', quality === 'fast' ? 'veryfast' : 'medium', '-pix_fmt', 'yuv420p']
    default:
      return ['-c:v', 'libx264', '-preset', quality === 'fast' ? 'veryfast' : quality === 'quality' ? 'slow' : 'medium',
        '-crf', quality === 'quality' ? '18' : '21', '-pix_fmt', 'yuv420p']
  }
}

/* ---- 高速レンダリング：フレームを順次受け取ってFFmpegへ直接流し込む ---- */
interface AudioPart {
  path: string
  start: number      // タイムライン上の開始秒
  inPoint: number    // 素材内の開始秒
  duration: number
  volume: number     // 0〜1
  fadeIn?: number
  fadeOut?: number
  speed?: number
}
interface BakeSession {
  proc: ReturnType<typeof spawn>
  outPath: string
  tmpVideo: string
  format: string
  fps: number
  done: Promise<{ ok: boolean; error?: string }>
}
let bake: BakeSession | null = null

// 音声トラックをミックスして1本の音声ファイルにする
async function mixAudio(ffmpeg: string, parts: AudioPart[], totalDur: number): Promise<string | null> {
  if (parts.length === 0) return null
  const outPath = path.join(app.getPath('temp'), `dds_audio_${Date.now()}.m4a`)
  const args: string[] = ['-y']
  for (const p of parts) {
    args.push('-ss', String(p.inPoint), '-t', String(p.duration), '-i', p.path)
  }
  // 各入力を遅延・音量・フェード処理して合成
  const filters: string[] = []
  parts.forEach((p, i) => {
    const f: string[] = []
    if (p.speed && p.speed !== 1) f.push(`atempo=${Math.min(2, Math.max(0.5, p.speed))}`)
    f.push(`adelay=${Math.round(p.start * 1000)}|${Math.round(p.start * 1000)}`)
    f.push(`volume=${p.volume.toFixed(3)}`)
    if (p.fadeIn && p.fadeIn > 0) f.push(`afade=t=in:st=${p.start.toFixed(3)}:d=${p.fadeIn}`)
    if (p.fadeOut && p.fadeOut > 0) f.push(`afade=t=out:st=${(p.start + p.duration - p.fadeOut).toFixed(3)}:d=${p.fadeOut}`)
    filters.push(`[${i}:a]${f.join(',')}[a${i}]`)
  })
  const mixIn = parts.map((_, i) => `[a${i}]`).join('')
  filters.push(`${mixIn}amix=inputs=${parts.length}:duration=longest:dropout_transition=0,apad,atrim=0:${totalDur.toFixed(3)}[aout]`)

  args.push('-filter_complex', filters.join(';'), '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', outPath)

  const ok = await new Promise<boolean>((resolve) => {
    const p = spawn(ffmpeg, args)
    let err = ''
    p.stderr.on('data', (d) => (err += d.toString()))
    p.on('close', (code) => { if (code !== 0) console.error('音声ミックス失敗:', err.slice(-400)); resolve(code === 0) })
    p.on('error', () => resolve(false))
  })
  return ok ? outPath : null
}

ipcMain.handle('bake:start', async (_e, opts: {
  width: number; height: number; fps: number; format: string; quality: 'fast' | 'balanced' | 'quality'
}) => {
  if (!win) return { ok: false }
  const ffmpeg = resolveFfmpegPath()
  if (!ffmpeg || !fs.existsSync(ffmpeg)) return { ok: false, error: 'FFmpeg が見つかりませんでした。' }

  const res = await dialog.showSaveDialog(win, {
    title: '演出ごと書き出し',
    defaultPath: `export.${opts.format}`,
    filters: [{ name: opts.format.toUpperCase(), extensions: [opts.format] }],
  })
  if (res.canceled || !res.filePath) return { ok: false, canceled: true }

  const enc = await detectEncoder(ffmpeg)
  const tmpVideo = path.join(app.getPath('temp'), `dds_video_${Date.now()}.mp4`)
  const args = [
    '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', `${opts.width}x${opts.height}`,
    '-r', String(opts.fps),
    '-i', 'pipe:0',
    ...encoderArgs(enc, opts.quality),
    tmpVideo,
  ]

  const proc = spawn(ffmpeg, args)
  let stderr = ''
  proc.stderr.on('data', (d) => {
    stderr += d.toString()
    win?.webContents.send('export:progress', d.toString())
  })
  proc.stdin?.on('error', () => { /* EPIPE 無視 */ })

  const done = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    proc.on('close', (code) => resolve(code === 0 ? { ok: true } : { ok: false, error: `FFmpeg 終了コード ${code}\n${stderr.slice(-600)}` }))
    proc.on('error', (err) => resolve({ ok: false, error: String(err) }))
  })

  bake = { proc, outPath: res.filePath, tmpVideo, format: opts.format, fps: opts.fps, done }
  return { ok: true, filePath: res.filePath, encoder: enc }
})

// フレーム（RGBA生データ）を書き込む。バックプレッシャー対応で待つ。
ipcMain.handle('bake:frame', async (_e, buf: ArrayBuffer) => {
  const session = bake
  if (!session || !session.proc.stdin) return { ok: false, error: 'セッションがありません' }
  const stdin = session.proc.stdin
  const b = Buffer.from(buf)
  return await new Promise((resolve) => {
    const ok = stdin.write(b, (err) => { if (err) resolve({ ok: false, error: String(err) }) })
    if (ok) resolve({ ok: true })
    else stdin.once('drain', () => resolve({ ok: true }))
  })
})

ipcMain.handle('bake:finish', async (_e, opts?: { audio?: AudioPart[]; totalDuration?: number }) => {
  const session = bake
  if (!session) return { ok: false }
  try { session.proc.stdin?.end() } catch { /* noop */ }
  const r = await session.done
  bake = null

  if (!r.ok) {
    try { fs.unlinkSync(session.tmpVideo) } catch { /* noop */ }
    return r
  }

  const ffmpeg = resolveFfmpegPath()
  const parts = opts?.audio ?? []
  let audioPath: string | null = null

  try {
    if (parts.length > 0 && ffmpeg) {
      win?.webContents.send('export:progress', 'stage=audio')
      audioPath = await mixAudio(ffmpeg, parts, opts?.totalDuration ?? 0)
    }

    // 映像＋音声を結合して最終ファイルへ
    win?.webContents.send('export:progress', 'stage=mux')
    const args = ['-y', '-i', session.tmpVideo]
    if (audioPath) args.push('-i', audioPath)
    args.push('-c:v', 'copy')
    if (audioPath) args.push('-c:a', 'aac', '-b:a', '192k', '-map', '0:v:0', '-map', '1:a:0', '-shortest')
    args.push('-movflags', '+faststart', session.outPath)

    const muxed = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const p = spawn(ffmpeg, args)
      let err = ''
      p.stderr.on('data', (d) => (err += d.toString()))
      p.on('close', (code) => resolve(code === 0 ? { ok: true } : { ok: false, error: `結合失敗 (code ${code})\n${err.slice(-400)}` }))
      p.on('error', (e) => resolve({ ok: false, error: String(e) }))
    })

    return muxed.ok ? { ok: true, filePath: session.outPath, hasAudio: !!audioPath } : muxed
  } finally {
    try { fs.unlinkSync(session.tmpVideo) } catch { /* noop */ }
    if (audioPath) { try { fs.unlinkSync(audioPath) } catch { /* noop */ } }
  }
})

ipcMain.handle('bake:cancel', async () => {
  if (!bake) return { ok: true }
  const session = bake
  bake = null
  try { session.proc.kill('SIGKILL') } catch { /* noop */ }
  setTimeout(() => { try { fs.unlinkSync(session.tmpVideo) } catch { /* noop */ } }, 500)
  return { ok: true }
})

// 録画した WebM を最終形式（MP4等）に変換して保存
ipcMain.handle('export:bake', async (_e, opts: { base64: string; format: string }) => {
  if (!win) return { ok: false }
  const ffmpeg = resolveFfmpegPath()
  if (!ffmpeg || !fs.existsSync(ffmpeg)) return { ok: false, error: 'FFmpeg が見つかりませんでした。' }

  const res = await dialog.showSaveDialog(win, {
    title: '演出ごと書き出し',
    defaultPath: `export.${opts.format}`,
    filters: [{ name: opts.format.toUpperCase(), extensions: [opts.format] }],
  })
  if (res.canceled || !res.filePath) return { ok: false, canceled: true }
  const outPath = res.filePath

  const tmp = path.join(app.getPath('temp'), `dds_bake_${Date.now()}.webm`)
  try {
    fs.writeFileSync(tmp, Buffer.from(opts.base64, 'base64'))
  } catch (err) {
    return { ok: false, error: '一時ファイルの書き込みに失敗: ' + String(err) }
  }

  const args = ['-y', '-i', tmp]
  if (opts.format === 'webm') args.push('-c', 'copy')
  else args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k')
  args.push(outPath)

  return await new Promise((resolve) => {
    const proc = spawn(ffmpeg, args)
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString(); win?.webContents.send('export:progress', d.toString()) })
    proc.on('close', (code) => {
      try { fs.unlinkSync(tmp) } catch { /* noop */ }
      if (code === 0) resolve({ ok: true, filePath: outPath })
      else resolve({ ok: false, error: `FFmpeg 終了コード ${code}\n${stderr.slice(-500)}` })
    })
    proc.on('error', (err) => resolve({ ok: false, error: String(err) }))
  })
})

// テキスト系ファイル（EDL / XML など）を保存
ipcMain.handle('file:saveText', async (_e, opts: { content: string; ext: string; filterName: string }) => {
  if (!win) return { ok: false }
  const res = await dialog.showSaveDialog(win, {
    title: '他ソフト用に保存',
    defaultPath: `project.${opts.ext}`,
    filters: [{ name: opts.filterName, extensions: [opts.ext] }],
  })
  if (res.canceled || !res.filePath) return { ok: false, canceled: true }
  try {
    fs.writeFileSync(res.filePath, opts.content, 'utf-8')
    return { ok: true, filePath: res.filePath }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

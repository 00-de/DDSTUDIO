import { contextBridge, ipcRenderer } from 'electron'

export interface MediaFile {
  path: string
  name: string
  ext: string
  url: string
}

const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  importMedia: (): Promise<MediaFile[]> => ipcRenderer.invoke('dialog:importMedia'),

  saveProject: (data: string, filePath?: string): Promise<{ ok: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('project:save', { data, filePath }),

  openProject: (): Promise<{ ok: boolean; filePath?: string; data?: string; error?: string }> =>
    ipcRenderer.invoke('project:open'),

  openProjectPath: (filePath: string): Promise<{ ok: boolean; filePath?: string; data?: string; error?: string }> =>
    ipcRenderer.invoke('project:openPath', filePath),

  exportVideo: (opts: {
    clips: { path: string }[]
    format: string
    resolution: string
    fps: number
  }): Promise<{ ok: boolean; filePath?: string; error?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('export:video', opts),

  showInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:showInFolder', filePath),

  relinkMedia: (names: string[]): Promise<{ ok: boolean; folder?: string; found?: Record<string, { path: string; url: string }>; matched?: number; canceled?: boolean }> =>
    ipcRenderer.invoke('media:relink', names),

  readFileBytes: (filePath: string): Promise<ArrayBuffer | null> =>
    ipcRenderer.invoke('file:readBytes', filePath),

  audioPeaks: (filePath: string, buckets: number): Promise<number[] | null> =>
    ipcRenderer.invoke('audio:peaks', { path: filePath, buckets }),

  saveTextFile: (content: string, ext: string, filterName: string): Promise<{ ok: boolean; filePath?: string; error?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('file:saveText', { content, ext, filterName }),

  saveBakedVideo: (base64: string, format: string): Promise<{ ok: boolean; filePath?: string; error?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('export:bake', { base64, format }),

  detectEncoder: (): Promise<string> => ipcRenderer.invoke('export:detectEncoder'),

  bakeStart: (opts: { width: number; height: number; fps: number; format: string; quality: string }): Promise<{ ok: boolean; filePath?: string; encoder?: string; error?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('bake:start', opts),

  bakeFrame: (buf: ArrayBuffer): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('bake:frame', buf),

  bakeFinish: (opts?: { audio?: unknown[]; totalDuration?: number }): Promise<{ ok: boolean; filePath?: string; error?: string; hasAudio?: boolean }> =>
    ipcRenderer.invoke('bake:finish', opts),

  bakeCancel: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('bake:cancel'),

  onExportProgress: (cb: (line: string) => void): (() => void) => {
    const listener = (_e: unknown, line: string) => cb(line)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.removeListener('export:progress', listener)
  },
}

contextBridge.exposeInMainWorld('dds', api)

export type DDSApi = typeof api

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

  onExportProgress: (cb: (line: string) => void): (() => void) => {
    const listener = (_e: unknown, line: string) => cb(line)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.removeListener('export:progress', listener)
  },
}

contextBridge.exposeInMainWorld('dds', api)

export type DDSApi = typeof api

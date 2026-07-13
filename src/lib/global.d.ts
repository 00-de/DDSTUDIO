import type { MediaFile } from '../../electron/preload'

declare global {
  interface Window {
    dds: {
      getVersion: () => Promise<string>
      importMedia: () => Promise<MediaFile[]>
      saveProject: (data: string, filePath?: string) => Promise<{ ok: boolean; filePath?: string; error?: string }>
      openProject: () => Promise<{ ok: boolean; filePath?: string; data?: string; error?: string }>
      openProjectPath: (filePath: string) => Promise<{ ok: boolean; filePath?: string; data?: string; error?: string }>
      exportVideo: (opts: {
        clips: { path: string }[]
        format: string
        resolution: string
        fps: number
      }) => Promise<{ ok: boolean; filePath?: string; error?: string; canceled?: boolean }>
      showInFolder: (filePath: string) => Promise<void>
      onExportProgress: (cb: (line: string) => void) => () => void
    }
  }
}

export {}

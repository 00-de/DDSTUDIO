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
      relinkMedia: (names: string[]) => Promise<{ ok: boolean; folder?: string; found?: Record<string, { path: string; url: string }>; matched?: number; canceled?: boolean }>
      readFileBytes: (filePath: string) => Promise<ArrayBuffer | null>
      audioPeaks: (filePath: string, buckets: number) => Promise<number[] | null>
      saveTextFile: (content: string, ext: string, filterName: string) => Promise<{ ok: boolean; filePath?: string; error?: string; canceled?: boolean }>
      saveBakedVideo: (base64: string, format: string) => Promise<{ ok: boolean; filePath?: string; error?: string; canceled?: boolean }>
      detectEncoder: () => Promise<string>
      bakeStart: (opts: { width: number; height: number; fps: number; format: string; quality: string }) => Promise<{ ok: boolean; filePath?: string; encoder?: string; error?: string; canceled?: boolean }>
      bakeFrame: (buf: ArrayBuffer) => Promise<{ ok: boolean; error?: string }>
      bakeFinish: (opts?: { audio?: unknown[]; totalDuration?: number }) => Promise<{ ok: boolean; filePath?: string; error?: string; hasAudio?: boolean }>
      bakeCancel: () => Promise<{ ok: boolean }>
      onExportProgress: (cb: (line: string) => void) => () => void
    }
  }
}

export {}

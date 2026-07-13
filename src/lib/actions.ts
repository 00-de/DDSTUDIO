import { useStore } from '@/store/useStore'
import type { MediaAsset } from '@/types'
import { kindFromExt, getMediaDuration } from '@/lib/media'

const uid = () => Math.random().toString(36).slice(2, 10)

export async function importMedia() {
  const files = await window.dds.importMedia()
  if (!files.length) return
  const assets: MediaAsset[] = await Promise.all(
    files.map(async (f) => {
      const kind = kindFromExt(f.ext)
      const duration = await getMediaDuration(f.url, kind)
      return { id: uid(), name: f.name, path: f.path, url: f.url, ext: f.ext, kind, duration }
    })
  )
  useStore.getState().addAssets(assets)
}

export async function saveProject(saveAs = false) {
  const { project, filePath, markSaved, pushRecent } = useStore.getState()
  const data = JSON.stringify(project, null, 2)
  const res = await window.dds.saveProject(data, saveAs ? undefined : filePath)
  if (res.ok && res.filePath) {
    markSaved(res.filePath)
    pushRecent({ name: project.name, path: res.filePath, at: Date.now() })
    return true
  }
  return false
}

export async function openProject() {
  const res = await window.dds.openProject()
  if (res.ok && res.data && res.filePath) {
    try {
      const p = JSON.parse(res.data)
      useStore.getState().loadProject(p, res.filePath)
      useStore.getState().pushRecent({ name: p.name, path: res.filePath, at: Date.now() })
      return true
    } catch {
      alert('プロジェクトファイルを読み込めませんでした。')
    }
  }
  return false
}

export async function openRecent(path: string) {
  const res = await window.dds.openProjectPath(path)
  if (res.ok && res.data && res.filePath) {
    try {
      const p = JSON.parse(res.data)
      useStore.getState().loadProject(p, res.filePath)
      useStore.getState().pushRecent({ name: p.name, path: res.filePath, at: Date.now() })
      return true
    } catch {
      alert('プロジェクトファイルを読み込めませんでした。')
    }
  } else {
    alert('ファイルを開けませんでした。移動または削除された可能性があります。')
  }
  return false
}

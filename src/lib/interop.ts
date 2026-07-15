import type { Project } from '@/types'

const RES_WH: Record<string, [number, number]> = {
  '720p': [1280, 720],
  '1080p': [1920, 1080],
  '2k': [2560, 1440],
  '4k': [3840, 2160],
}

function tc(sec: number, fps: number): string {
  const total = Math.max(0, Math.round(sec * fps))
  const f = total % fps
  const s = Math.floor(total / fps)
  const ss = s % 60
  const mm = Math.floor(s / 60) % 60
  const hh = Math.floor(s / 3600)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(hh)}:${p(mm)}:${p(ss)}:${p(f)}`
}

// ===== EDL (CMX3600) — VEGAS Pro / Premiere / Resolve 等 =====
export function buildEDL(project: Project): string {
  const fps = project.fps
  const vtrack = project.tracks.find((t) => t.type === 'video')
  const clips = (vtrack?.clips ?? []).slice().sort((a, b) => a.start - b.start)

  let out = `TITLE: ${project.name || 'DayDream Project'}\r\nFCM: NON-DROP FRAME\r\n\r\n`
  clips.forEach((c, i) => {
    const n = String(i + 1).padStart(3, '0')
    const asset = project.assets.find((a) => a.id === c.assetId)
    const name = asset?.name ?? c.label
    const srcIn = tc(0, fps)
    const srcOut = tc(c.duration, fps)
    const recIn = tc(c.start, fps)
    const recOut = tc(c.start + c.duration, fps)
    out += `${n}  AX       V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}\r\n`
    out += `* FROM CLIP NAME: ${name}\r\n`
    if (asset?.path) out += `* SOURCE FILE: ${asset.path}\r\n`
    out += `\r\n`
  })
  return out
}

// ===== Final Cut Pro 7 XML (xmeml) — Premiere / Resolve 等 =====
export function buildFCPXML(project: Project): string {
  const fps = project.fps
  const [w, h] = RES_WH[project.resolution] ?? [1920, 1080]
  const F = (sec: number) => Math.round(sec * fps)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const vtrack = project.tracks.find((t) => t.type === 'video')
  const clips = (vtrack?.clips ?? []).slice().sort((a, b) => a.start - b.start)
  const seqDur = F(project.durationSec)

  const rate = `<rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>`

  let items = ''
  clips.forEach((c, i) => {
    const asset = project.assets.find((a) => a.id === c.assetId)
    const name = esc(asset?.name ?? c.label)
    const url = asset?.url ? esc(asset.url) : ''
    const start = F(c.start)
    const end = F(c.start + c.duration)
    const dur = F(c.duration)
    items += `
          <clipitem id="clipitem-${i + 1}">
            <name>${name}</name>
            <duration>${dur}</duration>
            ${rate}
            <start>${start}</start>
            <end>${end}</end>
            <in>0</in>
            <out>${dur}</out>
            <file id="file-${i + 1}">
              <name>${name}</name>
              <pathurl>${url}</pathurl>
              ${rate}
              <duration>${dur}</duration>
              <media><video><samplecharacteristics><width>${w}</width><height>${h}</height></samplecharacteristics></video></media>
            </file>
          </clipitem>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence>
    <name>${esc(project.name || 'DayDream Project')}</name>
    <duration>${seqDur}</duration>
    ${rate}
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>${w}</width>
            <height>${h}</height>
            ${rate}
          </samplecharacteristics>
        </format>
        <track>${items}
        </track>
      </video>
    </media>
  </sequence>
</xmeml>
`
}

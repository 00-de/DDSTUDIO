// 秒 → タイムコード HH:MM:SS;FF（VEGAS 風）
export function timecode(sec: number, fps = 60): string {
  const s = Math.max(0, sec)
  const f = Math.floor((s % 1) * fps)
  const total = Math.floor(s)
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(hh)}:${p(mm)}:${p(ss)};${p(f)}`
}

// 短い mm:ss.cc 表示
export function shortTime(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  const cs = Math.floor((s % 1) * 100)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(m)}:${p(ss)}.${p(cs)}`
}

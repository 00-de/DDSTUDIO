// コラージュ/PiP の定型レイアウト定義
// 各セルは中心座標(x,y: -50〜50 %)と拡大率(scale)で表す（クリップの x/y/scale に対応）
export interface Cell { x: number; y: number; scale: number; layer: number }
export interface CollageLayout { id: string; name: string; count: number; cells: Cell[] }

// グリッド生成ヘルパ（cols×rows を画面いっぱいに敷き詰める）
function grid(cols: number, rows: number): Cell[] {
  const cells: Cell[] = []
  const sw = 100 / cols   // 各セル幅(%)
  const sh = 100 / rows
  const scale = Math.min(sw, sh) / 100 // 画面に対する縮小率（object-contain 前提の近似）
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -50 + sw * (c + 0.5)
      const y = -50 + sh * (r + 0.5)
      cells.push({ x, y, scale: scale * 1.02, layer: r * cols + c })
    }
  }
  return cells
}

export const LAYOUTS: CollageLayout[] = [
  { id: 'full', name: '1（全画面）', count: 1, cells: [{ x: 0, y: 0, scale: 1, layer: 0 }] },
  { id: 'v2', name: '左右2分割', count: 2, cells: [
    { x: -25, y: 0, scale: 0.5, layer: 0 }, { x: 25, y: 0, scale: 0.5, layer: 1 },
  ] },
  { id: 'h2', name: '上下2分割', count: 2, cells: [
    { x: 0, y: -25, scale: 0.5, layer: 0 }, { x: 0, y: 25, scale: 0.5, layer: 1 },
  ] },
  { id: 'v3', name: '3分割（縦帯）', count: 3, cells: [
    { x: -33.3, y: 0, scale: 0.333, layer: 0 }, { x: 0, y: 0, scale: 0.333, layer: 1 }, { x: 33.3, y: 0, scale: 0.333, layer: 2 },
  ] },
  { id: 'g4', name: '2×2（4枚）', count: 4, cells: grid(2, 2) },
  { id: 'g6', name: '3×2（6枚）', count: 6, cells: grid(3, 2) },
  { id: 'g9', name: '3×3（9枚）', count: 9, cells: grid(3, 3) },
  { id: 'g12', name: '4×3（12枚）', count: 12, cells: grid(4, 3) },
  { id: 'g15', name: '5×3（15枚）', count: 15, cells: grid(5, 3) },
  // PiP（メイン＋小窓）
  { id: 'pip1', name: 'PiP（右下に小窓）', count: 2, cells: [
    { x: 0, y: 0, scale: 1, layer: 0 },
    { x: 33, y: 30, scale: 0.28, layer: 1 },
  ] },
  { id: 'pip2', name: 'PiP（小窓2つ）', count: 3, cells: [
    { x: 0, y: 0, scale: 1, layer: 0 },
    { x: 34, y: -28, scale: 0.26, layer: 1 },
    { x: 34, y: 28, scale: 0.26, layer: 2 },
  ] },
  { id: 'pip3', name: 'PiP（左右小窓）', count: 3, cells: [
    { x: 0, y: 0, scale: 1, layer: 0 },
    { x: -34, y: 30, scale: 0.26, layer: 1 },
    { x: 34, y: 30, scale: 0.26, layer: 2 },
  ] },
]

export function layoutById(id: string): CollageLayout | undefined {
  return LAYOUTS.find((l) => l.id === id)
}

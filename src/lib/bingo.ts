import type { BingoResult } from '@/types'

export const BINGO_LINES: number[][] = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  [0,6,12,18,24],[4,8,12,16,20],
]

export function checkBingo(stamped: Set<number>): BingoResult {
  const effective = new Set(stamped)
  effective.add(12)
  const completedLines = BINGO_LINES.filter(line => line.every(idx => effective.has(idx)))
  return { lines: completedLines }
}

export const FREE_CELL = 'FREE'

/** そのマスが「出た」扱いか（FREE は常に出た扱い） */
export function isCellDrawn(cell: string, drawn: ReadonlySet<string>): boolean {
  return cell === FREE_CELL || drawn.has(cell)
}

/**
 * 出たカード一覧から、そろっているラインを返す。
 * サーバー側（DB関数 claim_bingo）の判定と同じルール: ラインの5マスが全て「出た」か FREE。
 */
export function completedLinesByDraws(cells: readonly string[], drawn: ReadonlySet<string>): number[][] {
  return BINGO_LINES.filter(line => line.every(idx => isCellDrawn(cells[idx], drawn)))
}

/** あと1マスでそろうライン（リーチ）の数 */
export function reachLineCount(cells: readonly string[], drawn: ReadonlySet<string>): number {
  return BINGO_LINES.filter(line => line.filter(idx => isCellDrawn(cells[idx], drawn)).length === 4).length
}

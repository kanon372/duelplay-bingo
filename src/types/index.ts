export type Civilization = '光' | '水' | '火' | '自然' | '闇'

export interface BingoCard {
  id: number
  civilization: Civilization
  cells: string[]  // 25要素。'FREE' または カードID文字列
  assigned: boolean
  assigned_at: string | null
}

export interface MyCard {
  id: number
  civilization: Civilization
}

export interface BingoResult {
  lines: number[][]
}

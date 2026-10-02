import { describe, it, expect } from 'vitest'
import { checkBingo, BINGO_LINES } from './bingo'

describe('BINGO_LINES', () => {
  it('12ライン（横5+縦5+斜め2）を持つ', () => {
    expect(BINGO_LINES).toHaveLength(12)
  })
})

describe('checkBingo', () => {
  it('何もスタンプがないとビンゴなし', () => {
    expect(checkBingo(new Set()).lines).toHaveLength(0)
  })
  it('FREEマス（インデックス12）だけではビンゴなし', () => {
    expect(checkBingo(new Set([12])).lines).toHaveLength(0)
  })
  it('横一列（0〜4）がスタンプされるとビンゴ', () => {
    const result = checkBingo(new Set([0, 1, 2, 3, 4]))
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.lines[0]).toEqual([0, 1, 2, 3, 4])
  })
  it('縦一列（0,5,10,15,20）がスタンプされるとビンゴ', () => {
    const result = checkBingo(new Set([0, 5, 10, 15, 20]))
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.lines[0]).toEqual([0, 5, 10, 15, 20])
  })
  it('斜め（0,6,12,18,24）がスタンプされるとビンゴ', () => {
    expect(checkBingo(new Set([0, 6, 12, 18, 24])).lines.length).toBeGreaterThan(0)
  })
  it('4マスだけではビンゴなし', () => {
    expect(checkBingo(new Set([0, 1, 2, 3])).lines).toHaveLength(0)
  })
})

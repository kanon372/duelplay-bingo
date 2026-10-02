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

import { completedLinesByDraws, reachLineCount, isCellDrawn } from './bingo'

describe('出たカードによるビンゴ判定', () => {
  const cells = Array.from({ length: 25 }, (_, i) => (i === 12 ? 'FREE' : `c${i}`))
  const drawn = (...idx: number[]) => new Set(idx.map(i => `c${i}`))

  it('FREE は常に出た扱い', () => {
    expect(isCellDrawn('FREE', new Set())).toBe(true)
    expect(isCellDrawn('c1', new Set())).toBe(false)
  })
  it('何も出ていなければ成立なし・リーチなし', () => {
    expect(completedLinesByDraws(cells, new Set())).toEqual([])
    expect(reachLineCount(cells, new Set())).toBe(0)
  })
  it('FREEを通る中央の行は4マスでそろう', () => {
    expect(completedLinesByDraws(cells, drawn(10, 11, 13, 14))).toEqual([[10, 11, 12, 13, 14]])
  })
  it('12本全てのラインを検出する', () => {
    BINGO_LINES.forEach(line => {
      const d = new Set(line.filter(i => i !== 12).map(i => `c${i}`))
      expect(completedLinesByDraws(cells, d)).toContainEqual(line)
    })
  })
  it('4マスだけではライン不成立で、リーチとして数える', () => {
    const d = drawn(0, 1, 2, 3)
    expect(completedLinesByDraws(cells, d)).toEqual([])
    expect(reachLineCount(cells, d)).toBe(1)
  })
  it('複数ラインが同時にそろう', () => {
    expect(completedLinesByDraws(cells, drawn(0, 1, 2, 3, 4, 5, 6, 7, 8, 9))).toHaveLength(2)
  })
  it('別のカードの番号は関係ない', () => {
    expect(completedLinesByDraws(cells, new Set(['x0', 'x1', 'x2', 'x3', 'x4']))).toEqual([])
  })
})

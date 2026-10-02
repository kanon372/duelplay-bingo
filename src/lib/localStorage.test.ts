import { describe, it, expect, beforeEach } from 'vitest'
import { getMyCards, addMyCard, canAddCard, getStamps, toggleStamp } from './localStorage'

beforeEach(() => { localStorage.clear() })

describe('getMyCards', () => {
  it('初期状態は空配列', () => { expect(getMyCards()).toEqual([]) })
})
describe('addMyCard', () => {
  it('カードを追加できる', () => {
    addMyCard({ id: 1, civilization: '光' })
    expect(getMyCards()).toHaveLength(1)
  })
  it('同じカードは重複追加されない', () => {
    addMyCard({ id: 1, civilization: '光' })
    addMyCard({ id: 1, civilization: '光' })
    expect(getMyCards()).toHaveLength(1)
  })
})
describe('canAddCard', () => {
  it('0枚の時はtrue', () => { expect(canAddCard()).toBe(true) })
  it('3枚の時はfalse', () => {
    addMyCard({ id: 1, civilization: '光' })
    addMyCard({ id: 2, civilization: '水' })
    addMyCard({ id: 3, civilization: '火' })
    expect(canAddCard()).toBe(false)
  })
})
describe('getStamps / toggleStamp', () => {
  it('初期状態はスタンプなし', () => { expect(getStamps(1)).toEqual(new Set()) })
  it('スタンプを追加できる', () => { toggleStamp(1, 0); expect(getStamps(1).has(0)).toBe(true) })
  it('スタンプを解除できる', () => { toggleStamp(1, 0); toggleStamp(1, 0); expect(getStamps(1).has(0)).toBe(false) })
  it('FREEマス（12）は変更できない', () => { toggleStamp(1, 12); expect(getStamps(1).has(12)).toBe(false) })
})

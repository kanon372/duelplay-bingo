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

import { getToken, setToken, setMyCards, clearSession, setParticipantNo, getParticipantNo } from './localStorage'

describe('token / setMyCards / clearSession', () => {
  it('トークンを保存・取得できる', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
  })
  it('setMyCards はサーバーの内容で置き換え、外れたカードのスタンプ記録を消す', () => {
    addMyCard({ id: 1, civilization: '光' })
    addMyCard({ id: 2, civilization: '水' })
    toggleStamp(1, 0)
    toggleStamp(2, 0)
    setMyCards([{ id: 2, civilization: '水' }, { id: 5, civilization: '火' }])
    expect(getMyCards().map(c => c.id)).toEqual([2, 5])
    expect(getStamps(1).size).toBe(0)
    expect(getStamps(2).has(0)).toBe(true)
  })
  it('setMyCards は3枚までに切り詰める', () => {
    setMyCards([1, 2, 3, 4].map(id => ({ id, civilization: '光' as const })))
    expect(getMyCards()).toHaveLength(3)
  })
  it('clearSession は参加者に関する保存を全て消す', () => {
    setToken('abc'); setParticipantNo(7)
    addMyCard({ id: 1, civilization: '光' }); toggleStamp(1, 3)
    clearSession()
    expect(getToken()).toBeNull()
    expect(getParticipantNo()).toBeNull()
    expect(getMyCards()).toEqual([])
    expect(getStamps(1).size).toBe(0)
  })
})

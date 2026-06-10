import type { MyCard } from '@/types'

const MY_CARDS_KEY = 'bingo_my_cards'
const STAMPS_PREFIX = 'bingo_stamps_'
const MAX_CARDS = 3
const FREE_INDEX = 12

export function getMyCards(): MyCard[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(MY_CARDS_KEY) ?? '[]') }
  catch { return [] }
}

export function addMyCard(card: MyCard): void {
  const cards = getMyCards()
  if (cards.some(c => c.id === card.id)) return
  if (cards.length >= MAX_CARDS) return
  cards.push(card)
  localStorage.setItem(MY_CARDS_KEY, JSON.stringify(cards))
}

export function canAddCard(): boolean {
  return getMyCards().length < MAX_CARDS
}

export function removeCard(cardId: number): void {
  const cards = getMyCards().filter(c => c.id !== cardId)
  if (typeof window !== 'undefined') {
    localStorage.setItem(MY_CARDS_KEY, JSON.stringify(cards))
    localStorage.removeItem(`${STAMPS_PREFIX}${cardId}`)
  }
}

export function getStamps(cardId: number): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${STAMPS_PREFIX}${cardId}`)
    return new Set<number>(JSON.parse(raw ?? '[]'))
  } catch { return new Set() }
}

export function toggleStamp(cardId: number, cellIndex: number): Set<number> {
  if (cellIndex === FREE_INDEX) return getStamps(cardId)
  const stamps = getStamps(cardId)
  if (stamps.has(cellIndex)) { stamps.delete(cellIndex) } else { stamps.add(cellIndex) }
  localStorage.setItem(`${STAMPS_PREFIX}${cardId}`, JSON.stringify([...stamps]))
  return stamps
}

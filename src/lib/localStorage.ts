import type { MyCard } from '@/types'

const MY_CARDS_KEY = 'bingo_my_cards'
const STAMPS_PREFIX = 'bingo_stamps_'
const PARTICIPANT_NO_KEY = 'bingo_participant_no'
const TOKEN_KEY = 'bingo_token'
const MAX_CARDS = 3
const FREE_INDEX = 12

/** 端末内の保存が変わったことを画面に知らせる（useLocalSession が購読する） */
export const LOCAL_CHANGE_EVENT = 'bingo-local-change'
function notifyChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT))
}

export function getParticipantNo(): number | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(PARTICIPANT_NO_KEY)
  return v ? Number(v) : null
}

export function setParticipantNo(no: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PARTICIPANT_NO_KEY, String(no))
  notifyChange()
}

/** 参加者の秘密トークン。本人確認はこれで行う（参加者番号は表示用） */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  notifyChange()
}

/** サーバーの内容でマイカード一覧を置き換える（サーバーが正、端末はキャッシュ） */
export function setMyCards(cards: MyCard[]): void {
  if (typeof window === 'undefined') return
  const keep = new Set(cards.map(c => c.id))
  for (const old of getMyCards()) {
    if (!keep.has(old.id)) localStorage.removeItem(`${STAMPS_PREFIX}${old.id}`)
  }
  localStorage.setItem(MY_CARDS_KEY, JSON.stringify(cards.slice(0, MAX_CARDS)))
  notifyChange()
}

/** 参加者に関する端末内の保存を全て消す（リセット後の古い端末用） */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  for (const card of getMyCards()) localStorage.removeItem(`${STAMPS_PREFIX}${card.id}`)
  localStorage.removeItem(MY_CARDS_KEY)
  localStorage.removeItem(PARTICIPANT_NO_KEY)
  localStorage.removeItem(TOKEN_KEY)
  notifyChange()
}

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
  notifyChange()
}

export function canAddCard(): boolean {
  return getMyCards().length < MAX_CARDS
}

export function removeCard(cardId: number): void {
  const cards = getMyCards().filter(c => c.id !== cardId)
  if (typeof window !== 'undefined') {
    localStorage.setItem(MY_CARDS_KEY, JSON.stringify(cards))
    localStorage.removeItem(`${STAMPS_PREFIX}${cardId}`)
    notifyChange()
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
  notifyChange()
  return stamps
}

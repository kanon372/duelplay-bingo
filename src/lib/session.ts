import { clearSession, getToken, setMyCards, setParticipantNo } from '@/lib/localStorage'
import type { BingoCard, MyCard } from '@/types'

export interface StampStatus { stamp_ad: boolean; stamp_nd: boolean; stamp_rental: boolean }

export interface SessionData {
  participantNo: number
  cards: MyCard[]
  stamps: StampStatus
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface MyClaim {
  id: number
  card_id: number
  lines: number
  status: ClaimStatus
  /** 却下を除いた現在の受付順位（1始まり） */
  rank: number
  claimed_at: string
}

export interface GameInfo { status: 'open' | 'closed'; prizeLimit: number }

export interface SessionWithCells {
  participantNo: number
  cards: BingoCard[]
  stamps: StampStatus
  claims: MyClaim[]
  game: GameInfo
}

async function postMe(token: string, withCells: boolean) {
  return fetch('/api/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, withCells }),
    cache: 'no-store',
  })
}

/**
 * サーバーから参加者の状態を取得して、端末のキャッシュを合わせる。
 * - トークンが無い／サーバー側で無効（リセット済み）なら端末の保存を消して null
 * - 通信エラーは例外（呼び出し側は端末のキャッシュ表示を続けてよい）
 */
export async function syncSession(): Promise<SessionData | null> {
  const token = getToken()
  if (!token) { clearSession(); return null }

  const res = await postMe(token, false)
  if (res.status === 401) { clearSession(); return null }
  if (!res.ok) throw new Error('sync failed')

  const data: SessionData = await res.json()
  setParticipantNo(data.participantNo)
  setMyCards(data.cards)
  return data
}

/** カードの中身（25マス）まで含めて取得する。カード表示画面用 */
export async function fetchMyCardsWithCells(): Promise<SessionWithCells | null> {
  const token = getToken()
  if (!token) return null
  const res = await postMe(token, true)
  if (res.status === 401) { clearSession(); return null }
  if (!res.ok) throw new Error('fetch failed')
  const data: SessionWithCells = await res.json()
  data.claims = data.claims ?? []
  setParticipantNo(data.participantNo)
  setMyCards(data.cards.map(c => ({ id: c.id, civilization: c.civilization })))
  return data
}

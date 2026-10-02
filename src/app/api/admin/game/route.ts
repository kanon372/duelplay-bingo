import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'
import { isClaimValidNow, loadGame, rankOf, type ClaimRow } from '@/lib/game'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

// ゲームで使われているカード番号の一覧（出たカード入力画面に並べる）。カードは開催中に変わらないので短時間キャッシュ
let cardNosCache: { at: number; value: string[] } | null = null
const CARD_NOS_TTL_MS = 5 * 60 * 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadCardNos(supabase: any): Promise<string[]> {
  if (cardNosCache && Date.now() - cardNosCache.at < CARD_NOS_TTL_MS) return cardNosCache.value
  const { data } = await supabase.from('bingo_cards').select('cells')
  const set = new Set<string>()
  for (const row of (data ?? []) as { cells: string[] }[]) {
    for (const c of row.cells) if (c !== 'FREE') set.add(c)
  }
  const value = [...set].sort()
  cardNosCache = { at: Date.now(), value }
  return value
}

/**
 * GET /api/admin/game — 運営コンソール用の全状態（設定・出たカード・申告一覧）。数秒おきにポーリングされる
 */
export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const supabase = getServiceClient()
  const [game, { data: draws }, { data: claims }, cardNos] = await Promise.all([
    loadGame(supabase),
    supabase.from('draws').select('card_no, drawn_at').order('seq', { ascending: true }),
    supabase.from('bingo_claims').select('*').order('seq', { ascending: true }),
    loadCardNos(supabase),
  ])

  const claimRows = (claims ?? []) as ClaimRow[]
  const drawn = new Set<string>((draws ?? []).map((d: { card_no: string }) => d.card_no))

  // 申告ごとに、カードの中身（いま成立しているか）と参加者番号を付ける
  const cardIds = claimRows.map(c => c.card_id)
  const { data: cards } = cardIds.length
    ? await supabase.from('bingo_cards').select('id, civilization, cells').in('id', cardIds)
    : { data: [] }
  const cardMap = new Map<number, { civilization: string; cells: string[] }>(
    ((cards ?? []) as { id: number; civilization: string; cells: string[] }[]).map(c => [c.id, c])
  )

  const approved = claimRows.filter(c => c.status === 'approved').length
  const view = claimRows.map(c => {
    const card = cardMap.get(c.card_id)
    return {
      id: c.id,
      participantNo: c.participant_id,
      cardId: c.card_id,
      civilization: card?.civilization ?? '',
      lines: c.lines,
      status: c.status,
      rank: c.status === 'rejected' ? null : rankOf(c, claimRows),
      claimedAt: c.claimed_at,
      validNow: card ? isClaimValidNow(card.cells, drawn) : false,
    }
  })

  return NextResponse.json(
    {
      game,
      drawn: draws ?? [],
      cardNos,
      claims: view,
      approvedCount: approved,
    },
    { headers: NO_STORE }
  )
}

/**
 * PATCH /api/admin/game — 設定の変更
 * body: { status?: 'open'|'closed', prizeLimit?: number, onePrizePerParticipant?: boolean }
 */
export async function PATCH(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status !== undefined) {
    if (body.status !== 'open' && body.status !== 'closed') {
      return NextResponse.json({ error: 'status が不正です' }, { status: 400 })
    }
    update.status = body.status
  }
  if (body.prizeLimit !== undefined) {
    if (!Number.isInteger(body.prizeLimit) || body.prizeLimit < 1 || body.prizeLimit > 10000) {
      return NextResponse.json({ error: '景品の人数は 1 以上の整数にしてください' }, { status: 400 })
    }
    update.prize_limit = body.prizeLimit
  }
  if (body.onePrizePerParticipant !== undefined) {
    if (typeof body.onePrizePerParticipant !== 'boolean') {
      return NextResponse.json({ error: 'onePrizePerParticipant が不正です' }, { status: 400 })
    }
    update.one_prize_per_participant = body.onePrizePerParticipant
  }

  const supabase = getServiceClient()
  const { error } = await supabase.from('game_state').update(update).eq('id', 1)
  if (error) {
    console.error('game_state update error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
  return NextResponse.json({ game: await loadGame(supabase) }, { headers: NO_STORE })
}

/**
 * DELETE /api/admin/game — ゲームのリセット（出たカードと申告を全て消し、受付中に戻す）。次のラウンド用
 * body: { confirm: 'reset' }
 */
export async function DELETE(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const body = await request.json().catch(() => ({}))
  if (body.confirm !== 'reset') {
    return NextResponse.json({ error: 'confirm が必要です' }, { status: 400 })
  }

  const supabase = getServiceClient()
  for (const step of [
    supabase.from('bingo_claims').delete().gte('id', 0),
    supabase.from('draws').delete().not('card_no', 'is', null),
    supabase.from('game_state').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', 1),
  ]) {
    const { error } = await step
    if (error) {
      console.error('game reset error:', error)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
  }
  return NextResponse.json({ message: 'ゲームをリセットしました（出たカード・申告を削除）' })
}

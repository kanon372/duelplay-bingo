import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { isUuid, NO_STAMPS, type StampRow } from '@/lib/participants'
import { loadGame, rankOf, type ClaimRow } from '@/lib/game'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/**
 * POST /api/me — 参加者本人の状態（番号・持っているカード・スタンプ）をサーバーから取得
 *
 * body: { token, withCells? }
 * 端末側の保存内容（localStorage）はあくまでキャッシュで、正はここで返す内容。
 * トークンが無効（リセット後の古い端末など）なら 401。
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const { token, withCells } = (body ?? {}) as { token?: unknown; withCells?: unknown }
  if (!isUuid(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401, headers: NO_STORE })
  }

  const supabase = getServiceClient()
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('token', token)
    .maybeSingle()
  if (!participant) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401, headers: NO_STORE })
  }

  const [{ data: cards, error: cardsErr }, { data: stamps }, { data: myClaims }, game] = await Promise.all([
    supabase
      .from('bingo_cards')
      .select(withCells === true ? 'id, civilization, cells' : 'id, civilization')
      .eq('participant_id', participant.id)
      .order('assigned_at', { ascending: true }),
    supabase
      .from('participant_stamps')
      .select('stamp_ad, stamp_nd, stamp_rental')
      .eq('participant_id', participant.id)
      .maybeSingle(),
    supabase
      .from('bingo_claims')
      .select('id, card_id, lines, seq, status, claimed_at')
      .eq('participant_id', participant.id)
      .order('seq', { ascending: true }),
    loadGame(supabase),
  ])
  if (cardsErr) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500, headers: NO_STORE })
  }

  const s: StampRow = { ...NO_STAMPS, ...(stamps ?? {}) }

  // 申告がある場合だけ、全体の申告から現在の順位を計算する
  let claims: (Pick<ClaimRow, 'id' | 'card_id' | 'lines' | 'status' | 'claimed_at'> & { rank: number })[] = []
  if ((myClaims ?? []).length > 0) {
    const { data: all } = await supabase.from('bingo_claims').select('seq, status').order('seq', { ascending: true })
    claims = (myClaims as ClaimRow[]).map(c => ({
      id: c.id, card_id: c.card_id, lines: c.lines, status: c.status, claimed_at: c.claimed_at,
      rank: rankOf(c, all ?? []),
    }))
  }

  return NextResponse.json(
    {
      participantNo: participant.id,
      cards: cards ?? [],
      stamps: s,
      claims,
      game: { status: game.status, prizeLimit: game.prizeLimit },
    },
    { headers: NO_STORE }
  )
}

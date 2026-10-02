import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { isUuid } from '@/lib/participants'
import { rankOf, type ClaimRow } from '@/lib/game'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * POST /api/bingo — ビンゴ申告
 * body: { token, cardId }
 *
 * 「カードが本人のものか」「ゲーム受付中か」「出たカードでラインがそろっているか」の判定と、
 * 受付順の採番は DB 関数 claim_bingo が1トランザクションで行う（運営の目視確認は不要）。
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const { token, cardId } = (body ?? {}) as { token?: unknown; cardId?: unknown }
  if (!isUuid(token) || !Number.isInteger(cardId)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: NO_STORE })
  }

  const supabase = getServiceClient()
  const { data: participant } = await supabase.from('participants').select('id').eq('token', token).maybeSingle()
  if (!participant) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401, headers: NO_STORE })
  }

  const { data: result, error } = await supabase.rpc('claim_bingo', {
    p_participant: participant.id,
    p_card: cardId,
  })
  if (error || !result) {
    console.error('claim_bingo error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500, headers: NO_STORE })
  }

  // 受け付けた（または申告済み）場合は、いまの順位を一緒に返す
  if ((result.status === 'ok' || result.status === 'already') && result.claimId) {
    const { data: claims } = await supabase
      .from('bingo_claims')
      .select('id, seq, status')
      .order('seq', { ascending: true })
    const all = (claims ?? []) as Pick<ClaimRow, 'id' | 'seq' | 'status'>[]
    const mine = all.find(c => c.id === result.claimId)
    return NextResponse.json(
      { ...result, rank: mine ? rankOf(mine, all) : null, claimStatus: mine?.status ?? 'pending' },
      { headers: NO_STORE }
    )
  }
  return NextResponse.json(result, { headers: NO_STORE })
}

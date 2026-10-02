import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'
import { isClaimValidNow, loadGame } from '@/lib/game'

/**
 * POST /api/admin/claims — 申告の承認・却下
 * body: { claimId: number, decision: 'approve' | 'reject' | 'pending' }   （pending は取り消して未判定に戻す）
 *
 * 承認時は、景品の残り人数と、申告がいまの「出たカード」でも成立しているかを必ず確認する
 * （出たカードの入力ミスを取り消した場合に、成立していない申告へ景品を渡さないため）。
 */
export async function POST(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const body = await request.json().catch(() => ({}))
  const { claimId, decision } = body as { claimId?: unknown; decision?: unknown }
  if (!Number.isInteger(claimId) || !['approve', 'reject', 'pending'].includes(decision as string)) {
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data: claim } = await supabase.from('bingo_claims').select('*').eq('id', claimId).maybeSingle()
  if (!claim) return NextResponse.json({ error: '申告が見つかりません' }, { status: 404 })

  if (decision === 'approve') {
    if (claim.status === 'approved') return NextResponse.json({ success: true, status: 'approved' })

    const [game, { data: card }, { data: draws }, { count }] = await Promise.all([
      loadGame(supabase),
      supabase.from('bingo_cards').select('cells').eq('id', claim.card_id).maybeSingle(),
      supabase.from('draws').select('card_no'),
      supabase.from('bingo_claims').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    ])
    const drawn = new Set<string>((draws ?? []).map((d: { card_no: string }) => d.card_no))
    if (!card || !isClaimValidNow(card.cells, drawn)) {
      return NextResponse.json(
        { error: 'この申告は、いまの出たカードではビンゴが成立していません（出たカードの入力が取り消されています）', code: 'invalid_now' },
        { status: 409 }
      )
    }
    if ((count ?? 0) >= game.prizeLimit) {
      return NextResponse.json(
        { error: `景品の人数（${game.prizeLimit}人）に達しています。増やす場合は設定を変更してください`, code: 'limit_reached' },
        { status: 409 }
      )
    }
  }

  const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending'
  const { error } = await supabase
    .from('bingo_claims')
    .update({ status, decided_at: status === 'pending' ? null : new Date().toISOString() })
    .eq('id', claimId)
  if (error) {
    console.error('claim update error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
  return NextResponse.json({ success: true, status })
}

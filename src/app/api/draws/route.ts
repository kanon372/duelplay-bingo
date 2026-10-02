import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { loadGame } from '@/lib/game'

/**
 * GET /api/draws — 出たカード一覧とゲーム状態（全員共通・認証なし）
 *
 * 全参加者が数秒おきに取りにくるので、CDNで数秒キャッシュして DB への負荷を一定にする。
 * 申告の受付は DB 側でキャッシュ無しの最新状態を見て判定するので、表示が数秒遅れても不正にはならない。
 */
export async function GET() {
  const supabase = getServiceClient()
  const [{ data: draws, error }, game] = await Promise.all([
    supabase.from('draws').select('card_no').order('seq', { ascending: true }),
    loadGame(supabase),
  ])
  if (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json(
    {
      drawn: (draws ?? []).map((d: { card_no: string }) => d.card_no),
      status: game.status,
      prizeLimit: game.prizeLimit,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=4' } }
  )
}

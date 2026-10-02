import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'

const CARD_NO_RE = /^[0-9A-Za-z_-]{1,32}$/

/**
 * POST /api/admin/draws — 出たカードの入力
 * body: { cardNo: string, action?: 'add' | 'remove' }   （action 省略は 'add'）
 * 同じカードを何度入力しても1件（連打・二重タップで増えない）。
 */
export async function POST(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const body = await request.json().catch(() => ({}))
  const { cardNo, action = 'add' } = body as { cardNo?: unknown; action?: unknown }
  if (typeof cardNo !== 'string' || !CARD_NO_RE.test(cardNo) || cardNo === 'FREE') {
    return NextResponse.json({ error: 'カード番号が不正です' }, { status: 400 })
  }
  if (action !== 'add' && action !== 'remove') {
    return NextResponse.json({ error: 'action が不正です' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { error } =
    action === 'add'
      ? await supabase.from('draws').upsert({ card_no: cardNo }, { onConflict: 'card_no', ignoreDuplicates: true })
      : await supabase.from('draws').delete().eq('card_no', cardNo)

  if (error) {
    console.error('draws error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
  return NextResponse.json({ success: true, cardNo, action })
}

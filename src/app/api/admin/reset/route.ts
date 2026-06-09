import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function checkAdminAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: '認証失敗' }, { status: 401 })

  const body = await request.json()
  const { cardId, resetAll } = body
  const supabase = getServiceClient()

  if (resetAll === true) {
    const { error } = await supabase.rpc('reset_all_cards')
    if (error) return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    return NextResponse.json({ message: '全カードをリセットしました' })
  }

  if (typeof cardId === 'number') {
    const { error } = await supabase.rpc('unassign_bingo_card', { card_id: cardId })
    if (error) return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    return NextResponse.json({ message: `カード${cardId}を未配布に戻しました` })
  }

  return NextResponse.json({ error: 'cardId または resetAll が必要です' }, { status: 400 })
}

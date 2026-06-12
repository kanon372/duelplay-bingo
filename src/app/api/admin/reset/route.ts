import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

function checkAdminAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: '認証失敗' }, { status: 401 })

  const body = await request.json()
  const { cardId, resetAll, resetStamps } = body
  const supabase = getServiceClient()

  // スタンプ・参加者のみリセット（カードはそのまま）
  if (resetStamps === true) {
    await supabase.from('participant_stamps').delete().gte('id', 0)
    await supabase.from('stamp_cards').delete().gte('id', 0)
    await supabase.from('participants').delete().gte('id', 0)
    await supabase.rpc('reset_participant_sequence').maybeSingle()
    return NextResponse.json({ message: 'スタンプ・参加者データをリセットしました' })
  }

  // カードのみリセット（スタンプ・参加者はそのまま）
  if (resetAll === true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('bingo_cards')
      .update({ assigned: false, assigned_at: null })
      .gte('id', 0)
    if (error) {
      console.error('reset_all error:', error)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
    return NextResponse.json({ message: '全カードをリセットしました' })
  }

  if (typeof cardId === 'number' && !isNaN(cardId)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('bingo_cards')
      .update({ assigned: false, assigned_at: null })
      .eq('id', cardId)
    if (error) {
      console.error('unassign error:', error)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
    return NextResponse.json({ message: `カード${cardId}を未配布に戻しました` })
  }

  return NextResponse.json({ error: 'cardId または resetAll が必要です' }, { status: 400 })
}

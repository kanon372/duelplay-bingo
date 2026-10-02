import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'

const FREE_CARD = { assigned: false, assigned_at: null, participant_id: null }

export async function POST(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const body = await request.json().catch(() => ({}))
  const { cardId, resetAll, resetStamps } = body
  const supabase = getServiceClient()

  // 参加者・スタンプ・カードの配布を全てリセット（新しいイベント用）
  // 参加者を消すので端末側のトークンは無効になり、各端末は次回アクセス時に自動で初期状態へ戻る。
  // 参加者番号は 1 から振り直すが、トークンで本人確認するので古い端末と番号が混ざることはない。
  if (resetStamps === true) {
    const steps = [
      supabase.from('bingo_cards').update(FREE_CARD).not('id', 'is', null),
      supabase.from('participant_stamps').delete().gte('id', 0),
      supabase.from('participants').delete().gte('id', 0),
    ]
    for (const step of steps) {
      const { error } = await step
      if (error) {
        console.error('reset participants error:', error)
        return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
      }
    }
    const { error } = await supabase.rpc('reset_participant_sequence')
    if (error) console.error('reset_participant_sequence error:', error)
    return NextResponse.json({ message: '参加者・スタンプ・カード配布をすべてリセットしました' })
  }

  // 全カードを未配布に戻す（参加者とスタンプは残る。持っていたカードは端末側から自動で消える）
  if (resetAll === true) {
    const { error } = await supabase.from('bingo_cards').update(FREE_CARD).not('id', 'is', null)
    if (error) {
      console.error('reset_all error:', error)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
    return NextResponse.json({ message: '全カードを未配布に戻しました' })
  }

  if (typeof cardId === 'number' && Number.isInteger(cardId)) {
    const { error } = await supabase.from('bingo_cards').update(FREE_CARD).eq('id', cardId)
    if (error) {
      console.error('unassign error:', error)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
    return NextResponse.json({ message: `カード${cardId}を未配布に戻しました` })
  }

  return NextResponse.json({ error: 'cardId または resetAll が必要です' }, { status: 400 })
}

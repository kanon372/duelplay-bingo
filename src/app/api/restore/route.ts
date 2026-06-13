import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

// GET /api/restore?participantNo=X — 参加者番号からカード情報を復元
export async function GET(request: NextRequest) {
  const participantNo = Number(request.nextUrl.searchParams.get('participantNo'))
  if (!participantNo || isNaN(participantNo) || participantNo <= 0) {
    return NextResponse.json({ error: '有効な参加者番号を入力してください' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any

  // 参加者レコードを検索
  const { data: participant } = await supabase
    .from('participants')
    .select('id, primary_card_id')
    .eq('id', participantNo)
    .single()

  if (!participant) {
    return NextResponse.json({ error: `参加者番号 ${participantNo} は存在しません` }, { status: 404 })
  }

  // そのカードから文明を取得
  const { data: card } = await supabase
    .from('bingo_cards')
    .select('id, civilization')
    .eq('id', participant.primary_card_id)
    .single()

  if (!card) {
    return NextResponse.json({ error: 'カード情報が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({
    participantNo: participant.id,
    card: { id: card.id, civilization: card.civilization },
  })
}

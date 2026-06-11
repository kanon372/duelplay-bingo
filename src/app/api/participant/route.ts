import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/participant — 初回カード取得時に参加者レコードを作成 or 既存参加者のカードを更新
export async function POST(request: NextRequest) {
  const { cardId, existingParticipantNo } = await request.json()
  if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 })

  const supabase = getServiceClient()

  // 既存の参加者番号がある場合 → そのレコードのカードIDを新しいカードに更新（番号を引き継ぐ）
  if (existingParticipantNo) {
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id')
      .eq('id', existingParticipantNo)
      .single()

    if (existingParticipant) {
      // 新しいカードIDが別の参加者に使われていないか確認
      const { data: cardTaken } = await supabase
        .from('participants')
        .select('id')
        .eq('primary_card_id', cardId)
        .single()

      if (!cardTaken) {
        // 既存参加者のカードIDを新しいカードに更新
        await supabase
          .from('participants')
          .update({ primary_card_id: cardId })
          .eq('id', existingParticipantNo)
        return NextResponse.json({ participantNo: existingParticipantNo })
      }

      // 新しいカードが既に別の参加者に紐付いている場合はその参加者番号を返す
      return NextResponse.json({ participantNo: cardTaken.id })
    }
  }

  // 通常フロー: すでに存在する場合は取得、なければ作成
  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('primary_card_id', cardId)
    .single()

  if (existing) {
    return NextResponse.json({ participantNo: existing.id })
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({ primary_card_id: cardId })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'サーバーエラー: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ participantNo: data.id })
}

// GET /api/participant?cardId=X — カードIDから参加者番号を取得
export async function GET(request: NextRequest) {
  const cardId = Number(request.nextUrl.searchParams.get('cardId'))
  if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 })

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('participants')
    .select('id')
    .eq('primary_card_id', cardId)
    .single()

  if (!data) return NextResponse.json({ participantNo: null })
  return NextResponse.json({ participantNo: data.id })
}

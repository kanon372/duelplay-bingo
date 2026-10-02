import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { isValidEventCode } from '@/lib/event'
import { CIVILIZATIONS, isUuid } from '@/lib/participants'

/**
 * POST /api/claim — カードを1枚受け取る（QRスキャン時）
 *
 * body: { code, civilization, token? }
 *  - code: QRに含まれるイベントコード（別イベントのQRはここで弾く）
 *  - token: 参加者の秘密トークン。無い／無効なら新しい参加者として登録する
 *
 * 枚数（3枚まで）とスタンプ条件の検証、カードの割り当ては全てDB関数 claim_bingo_card が
 * 1トランザクションで行うので、URL直打ちや並行リクエストで条件を回避できない。
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const { code, civilization, token } = (body ?? {}) as Record<string, unknown>

  if (!isValidEventCode(code)) {
    return NextResponse.json({ status: 'invalid_code' }, { status: 403 })
  }
  if (typeof civilization !== 'string' || !(CIVILIZATIONS as readonly string[]).includes(civilization)) {
    return NextResponse.json({ error: '無効な文明名です' }, { status: 400 })
  }

  const supabase = getServiceClient()

  let participant: { id: number; token: string } | null = null
  if (isUuid(token)) {
    const { data } = await supabase.from('participants').select('id, token').eq('token', token).maybeSingle()
    participant = data
  }
  if (!participant) {
    const { data, error } = await supabase.from('participants').insert({}).select('id, token').single()
    if (error || !data) {
      console.error('participant insert error:', error)
      return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
    }
    participant = data
  }

  const { data: result, error } = await supabase.rpc('claim_bingo_card', {
    p_civ: civilization,
    p_participant: participant!.id,
  })
  if (error || !result) {
    console.error('claim_bingo_card error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }

  return NextResponse.json(
    { ...result, participantNo: participant!.id, token: participant!.token },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

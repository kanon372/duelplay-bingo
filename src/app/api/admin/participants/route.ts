import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'


// GET /api/admin/participants — 参加者一覧＋スタンプ状況
export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)
const supabase = getServiceClient()

  // 参加者一覧
  const { data: participants, error: pErr } = await supabase
    .from('participants')
    .select('id, created_at')
    .order('id', { ascending: true })

  if (pErr) {
    console.error('participants fetch error:', pErr)
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  // スタンプ情報（別クエリ）
  const { data: stamps, error: sErr } = await supabase
    .from('participant_stamps')
    .select('participant_id, stamp_ad, stamp_nd, stamp_rental')

  if (sErr) {
    console.error('participant_stamps fetch error:', sErr)
  }

  // 参加者ごとの所持カード
  const { data: owned, error: cErr } = await supabase
    .from('bingo_cards')
    .select('id, civilization, participant_id')
    .not('participant_id', 'is', null)
    .order('id', { ascending: true })
  if (cErr) {
    console.error('owned cards fetch error:', cErr)
  }

  type StampRow = { participant_id: number; stamp_ad: boolean; stamp_nd: boolean; stamp_rental: boolean }
  type ParticipantRow = { id: number; created_at: string }
  type OwnedRow = { id: number; civilization: string; participant_id: number }
  const stampsMap = Object.fromEntries(
    ((stamps ?? []) as StampRow[]).map(s => [s.participant_id, s])
  )
  const cardsMap = new Map<number, { id: number; civilization: string }[]>()
  for (const c of (owned ?? []) as OwnedRow[]) {
    const list = cardsMap.get(c.participant_id) ?? []
    list.push({ id: c.id, civilization: c.civilization })
    cardsMap.set(c.participant_id, list)
  }

  const result = ((participants ?? []) as ParticipantRow[]).map(p => ({
    ...p,
    cards: cardsMap.get(p.id) ?? [],
    participant_stamps: stampsMap[p.id] ?? null,
  }))

  return NextResponse.json({ participants: result }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}

// DELETE /api/admin/participants — 参加者を削除
export async function DELETE(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)
const { participantNo } = await request.json()
  if (!participantNo) {
    return NextResponse.json({ error: 'participantNo required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 持っていたカードを未配布に戻す
  await supabase
    .from('bingo_cards')
    .update({ assigned: false, assigned_at: null, participant_id: null })
    .eq('participant_id', participantNo)

  // スタンプレコードを先に削除
  await supabase
    .from('participant_stamps')
    .delete()
    .eq('participant_id', participantNo)

  // 参加者レコードを削除
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantNo)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

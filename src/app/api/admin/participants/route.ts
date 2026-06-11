import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

function checkAdminAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// GET /api/admin/participants — 参加者一覧＋スタンプ状況
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: '認証失敗' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // 参加者一覧
  const { data: participants, error: pErr } = await supabase
    .from('participants')
    .select('id, primary_card_id, created_at')
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

  const stampsMap = Object.fromEntries(
    (stamps ?? []).map(s => [s.participant_id, s])
  )

  const result = (participants ?? []).map(p => ({
    ...p,
    participant_stamps: stampsMap[p.id] ?? null,
  }))

  return NextResponse.json({ participants: result }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}

// DELETE /api/admin/participants — 参加者を削除
export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: '認証失敗' }, { status: 401 })
  }

  const { participantNo } = await request.json()
  if (!participantNo) {
    return NextResponse.json({ error: 'participantNo required' }, { status: 400 })
  }

  const supabase = getServiceClient()

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

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

function checkAdminAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// POST /api/admin/stamp — 参加者番号でスタンプ付与・取消
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: '認証失敗' }, { status: 401 })
  }

  const { participantNo, stamp, value } = await request.json()
  if (!participantNo || !stamp || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })
  }

  const validStamps = ['stamp_ad', 'stamp_nd', 'stamp_rental']
  if (!validStamps.includes(stamp)) {
    return NextResponse.json({ error: '不正なスタンプ名' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // upsert で SELECT→INSERT の競合を回避
  const { error } = await supabase
    .from('participant_stamps')
    .upsert(
      { participant_id: participantNo, [stamp]: value },
      { onConflict: 'participant_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'サーバーエラー: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, participantNo })
}

// GET /api/admin/stamp?participantNo=X — 参加者番号でスタンプ状況確認
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: '認証失敗' }, { status: 401 })
  }

  const participantNo = request.nextUrl.searchParams.get('participantNo')
  if (!participantNo) return NextResponse.json({ error: 'participantNo required' }, { status: 400 })

  const supabase = getServiceClient()
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('id', participantNo)
    .single()

  if (!participant) {
    return NextResponse.json({ error: `参加者番号 ${participantNo} が見つかりません` }, { status: 404 })
  }

  const { data } = await supabase
    .from('participant_stamps')
    .select('stamp_ad, stamp_nd, stamp_rental')
    .eq('participant_id', participantNo)
    .single()

  return NextResponse.json({
    participantNo: Number(participantNo),
    stamp_ad:     data?.stamp_ad     ?? false,
    stamp_nd:     data?.stamp_nd     ?? false,
    stamp_rental: data?.stamp_rental ?? false,
  })
}

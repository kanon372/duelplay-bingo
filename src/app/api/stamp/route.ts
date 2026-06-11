import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

// GET /api/stamp?participantNo=X — お客さんのスタンプ状況を取得（参加者番号ベース）
export async function GET(request: NextRequest) {
  const participantNo = Number(request.nextUrl.searchParams.get('participantNo'))
  if (!participantNo) return NextResponse.json({ error: 'participantNo required' }, { status: 400 })

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('participant_stamps')
    .select('stamp_ad, stamp_nd, stamp_rental')
    .eq('participant_id', participantNo)
    .single()

  return NextResponse.json(
    {
      stamp_ad:     data?.stamp_ad     ?? false,
      stamp_nd:     data?.stamp_nd     ?? false,
      stamp_rental: data?.stamp_rental ?? false,
    },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}

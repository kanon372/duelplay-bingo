import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/stamp?participantNo=X — お客さんのスタンプ状況を取得（参加者番号ベース）
export async function GET(request: NextRequest) {
  const participantNo = Number(request.nextUrl.searchParams.get('participantNo'))
  if (!participantNo) return NextResponse.json({ error: 'participantNo required' }, { status: 400 })

  const supabase = getClient()
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

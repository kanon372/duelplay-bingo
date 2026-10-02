import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'

// GET /api/admin/restore-link?participantNo=X — 参加者の復元用URLを発行（スタッフ専用）
// 参加者番号は連番で推測できるため、復元には秘密トークンを含むURLが必要。
export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)

  const participantNo = Number(request.nextUrl.searchParams.get('participantNo'))
  if (!Number.isInteger(participantNo) || participantNo <= 0) {
    return NextResponse.json({ error: '有効な参加者番号を入力してください' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data } = await supabase.from('participants').select('id, token').eq('id', participantNo).maybeSingle()
  if (!data) {
    return NextResponse.json({ error: `参加者番号 ${participantNo} は存在しません` }, { status: 404 })
  }

  return NextResponse.json(
    { participantNo: data.id, path: `/restore/${data.token}` },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

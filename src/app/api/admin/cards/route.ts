import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

function checkAdminAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: '認証失敗' }, { status: 401 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('bingo_cards')
    .select('id, civilization, assigned, assigned_at')
    .order('id')

  if (error) return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })

  const summary = ['光', '水', '火', '自然', '闇'].map(civ => {
    const civCards = data.filter(c => c.civilization === civ)
    return {
      civilization: civ,
      total: civCards.length,
      assigned: civCards.filter(c => c.assigned).length,
      remaining: civCards.filter(c => !c.assigned).length,
    }
  })

  return NextResponse.json({ cards: data, summary })
}

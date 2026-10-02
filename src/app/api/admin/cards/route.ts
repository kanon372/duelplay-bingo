import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import { adminDeniedResponse, checkAdminAuth } from '@/lib/admin-auth'


export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request)
  if (auth !== 'ok') return adminDeniedResponse(auth)
const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('bingo_cards')
    .select('id, civilization, assigned, assigned_at')
    .order('id')

  if (error) return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })

  const rows = data as { id: number; civilization: string; assigned: boolean; assigned_at: string | null }[]

  const summary = ['光', '水', '火', '自然', '闇'].map(civ => {
    const civCards = rows.filter(c => c.civilization === civ)
    return {
      civilization: civ,
      total: civCards.length,
      assigned: civCards.filter(c => c.assigned).length,
      remaining: civCards.filter(c => !c.assigned).length,
    }
  })

  return NextResponse.json({ cards: rows, summary })
}

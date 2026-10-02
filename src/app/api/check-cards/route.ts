import { NextRequest, NextResponse } from 'next/server'
import { getAnonClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { cardIds } = await request.json()
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ validIds: [] })
  }

  const supabase = getAnonClient()

  const { data } = await supabase
    .from('bingo_cards')
    .select('id')
    .in('id', cardIds)
    .eq('assigned', true)

  const validIds = (data ?? []).map((row: { id: number }) => row.id)
  return NextResponse.json({ validIds })
}

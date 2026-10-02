import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { cardIds } = await request.json()
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ cards: [] })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('bingo_cards')
    .select('id, civilization, cells')
    .in('id', cardIds)
    .eq('assigned', true)

  if (error) return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  return NextResponse.json({ cards: data ?? [] })
}

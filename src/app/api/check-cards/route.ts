import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { cardIds } = await request.json()
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ validIds: [] })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('bingo_cards')
    .select('id')
    .in('id', cardIds)
    .eq('assigned', true)

  const validIds = (data ?? []).map((row: { id: number }) => row.id)
  return NextResponse.json({ validIds })
}

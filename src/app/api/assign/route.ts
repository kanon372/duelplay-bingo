import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'
import type { BingoCard } from '@/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { civilization } = body

  const validCivs = ['光', '水', '火', '自然', '闇']
  if (!validCivs.includes(civilization)) {
    return NextResponse.json({ error: '無効な文明名です' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any
  const { data, error } = await supabase.rpc('assign_bingo_card', { civ: civilization })

  if (error) {
    console.error('assign_bingo_card error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'この文明のカードはすべて配布済みです' }, { status: 409 })
  }

  return NextResponse.json({ card: data as BingoCard })
}

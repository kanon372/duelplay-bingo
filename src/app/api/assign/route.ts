import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { BingoCard } from '@/types'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { civilization } = body

  const validCivs = ['光', '水', '火', '自然', '闇']
  if (!validCivs.includes(civilization)) {
    return NextResponse.json({ error: '無効な文明名です' }, { status: 400 })
  }

  const supabase = getServiceClient()
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

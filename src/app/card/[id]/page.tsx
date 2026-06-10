import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BingoGrid from '@/components/BingoGrid'
import AddCardButton from '@/components/AddCardButton'
import type { BingoCard } from '@/types'

/**
 * 背景画像は 1500×1062px (元3035×2150の50%縮小)
 * グリッド位置はピクセル計測値をパーセントに変換
 *
 * 右側グリッド (水/火/自然): left≈47.1%, top≈12%, width≈51%, height≈75.5%
 * 左側グリッド (光/闇):     left≈2.6%,  top≈12%, width≈48.5%, height≈75.5%
 */
const CIV_CONFIG: Record<string, {
  bg: string
  layout: 'left' | 'right'
  accent: string
}> = {
  光:  { bg: '/backgrounds/hikari.jpg', layout: 'left',  accent: '#fbbf24' },
  水:  { bg: '/backgrounds/mizu.jpg',   layout: 'right', accent: '#38bdf8' },
  火:  { bg: '/backgrounds/hi.jpg',     layout: 'right', accent: '#f97316' },
  自然: { bg: '/backgrounds/shizen.jpg', layout: 'right', accent: '#4ade80' },
  闇:  { bg: '/backgrounds/yami.jpg',   layout: 'left',  accent: '#a78bfa' },
}

const GRID_STYLE: Record<'left' | 'right', React.CSSProperties> = {
  right: {
    position: 'absolute',
    left:   '47.1%',
    top:    '12.0%',
    width:  '51.0%',
    height: '75.5%',
  },
  left: {
    position: 'absolute',
    left:   '2.6%',
    top:    '12.0%',
    width:  '48.5%',
    height: '75.5%',
  },
}

import React from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CardPage({ params }: PageProps) {
  const { id } = await params
  const cardId = parseInt(id, 10)
  if (isNaN(cardId)) notFound()

  const { data, error } = await supabase
    .from('bingo_cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (error || !data) notFound()

  const card = data as BingoCard
  const config = CIV_CONFIG[card.civilization] ?? CIV_CONFIG['光']

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* カード本体 (16:9 landscape 画像に合わせる) */}
      <div className="w-full relative" style={{ aspectRatio: '1500/1062' }}>

        {/* 背景テンプレート画像 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={config.bg}
          alt={`${card.civilization}文明ビンゴカード`}
          className="absolute inset-0 w-full h-full object-fill"
        />

        {/* グリッドオーバーレイ */}
        <div style={GRID_STYLE[config.layout]}>
          <BingoGrid card={card} accentColor={config.accent} />
        </div>
      </div>

      {/* カード番号 + ボタン */}
      <div className="flex-1 bg-gray-950 px-4 py-3 flex flex-col gap-2">
        <p className="text-center text-gray-400 text-xs">
          {card.civilization}文明 No.{card.id}
        </p>
        <AddCardButton card={{ id: card.id, civilization: card.civilization }} />
        <a href="/" className="block text-center text-xs text-gray-500 underline">
          ← マイカード一覧へ
        </a>
      </div>
    </main>
  )
}

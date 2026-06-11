import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BingoGrid from '@/components/BingoGrid'
import AddCardButton from '@/components/AddCardButton'
import type { BingoCard } from '@/types'
import React from 'react'

/**
 * 背景画像: 1500×1062px (元3035×2150の50%縮小)
 *
 * 元画像(3035×2150)でのグリッド座標:
 *   行 (共通):
 *     Row0: y=365〜665  Row1: y=712〜1012  Row2: y=1059〜1359
 *     Row3: y=1403〜1703  Row4: y=1740〜2040
 *   左グリッド (光・闇):
 *     Col0: x=119〜329  Col1: x=372〜583  ...  Col4: x=1115〜1326
 *   右グリッド (水・火・自然):
 *     Col0: x=1638〜1848  Col1: x=1889〜2102  ...  Col4: x=2632〜2845
 *
 * パーセント換算 (3035×2150基準):
 *   左グリッド: left=119/3035=3.924%  top=365/2150=16.977%
 *              width=1207/3035=39.769%  height=1675/2150=77.907%
 *   右グリッド: left=1638/3035=53.972%  top=16.977%  width=39.769%  height=77.907%
 *
 * CSS gap (%はcontainer幅基準):
 *   column-gap: 39.25px/1207px = 3.252%
 *   row-gap:    43.75px×(2150/3035) / (1207×(2150/3035)) → 43.75/1207×(2150/3035比) ≈ 3.625%
 *   ※ cssのrow-gap%はinline-size(幅)基準なので計算変換済
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

// グリッド位置 (画像全体に対する %)
const GRID_STYLE: Record<'left' | 'right', React.CSSProperties> = {
  left: {
    position: 'absolute',
    left:   '3.924%',
    top:    '16.977%',
    width:  '39.769%',
    height: '77.907%',
  },
  right: {
    position: 'absolute',
    left:   '53.972%',
    top:    '16.977%',
    width:  '39.769%',
    height: '77.907%',
  },
}

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
      {/* カード本体 — 画像アスペクト比 3035:2150 を維持 */}
      <div className="w-full relative" style={{ aspectRatio: '3035/2150', overflow: 'hidden' }}>

        {/* 背景テンプレート画像 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={config.bg}
          alt={`${card.civilization}文明ビンゴカード`}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'fill' }}
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

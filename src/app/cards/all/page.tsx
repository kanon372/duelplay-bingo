'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BingoGrid from '@/components/BingoGrid'
import { getMyCards } from '@/lib/localStorage'
import type { BingoCard } from '@/types'
import React from 'react'

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

export default function AllCardsPage() {
  const [cards, setCards] = useState<BingoCard[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const myCards = getMyCards()
    if (myCards.length === 0) { setLoading(false); return }

    fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardIds: myCards.map(c => c.id) }),
    })
      .then(r => r.json())
      .then(({ cards: fetched }: { cards: BingoCard[] }) => {
        // マイカードの順番通りに並べる
        const ordered = myCards
          .map(mc => fetched.find(fc => fc.id === mc.id))
          .filter(Boolean) as BingoCard[]
        setCards(ordered)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-sm">読み込み中...</p>
      </main>
    )
  }

  if (cards.length === 0) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-gray-400">カードがありません</p>
        <button onClick={() => router.push('/')} className="text-blue-400 underline text-sm">
          ← マイカード一覧へ
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-gray-400 text-sm hover:text-white">
          ← 戻る
        </button>
        <span className="text-white text-sm font-bold">全カード表示</span>
        <span className="text-gray-500 text-xs">{cards.length}枚</span>
      </div>

      {/* カード一覧 */}
      <div className="flex flex-col">
        {cards.map((card, i) => {
          const config = CIV_CONFIG[card.civilization] ?? CIV_CONFIG['光']
          return (
            <div key={card.id}>
              {/* 文明ラベル */}
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <span className="text-white font-bold text-sm">{card.civilization}文明</span>
                <span className="text-gray-500 text-xs">No.{card.id}</span>
                <button
                  onClick={() => router.push(`/card/${card.id}`)}
                  className="ml-auto text-xs text-gray-500 underline hover:text-gray-300"
                >
                  個別に開く →
                </button>
              </div>

              {/* ビンゴカード */}
              <div className="w-full relative" style={{ aspectRatio: '3035/2150', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.bg}
                  alt={`${card.civilization}文明ビンゴカード`}
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: 'fill' }}
                />
                <div style={GRID_STYLE[config.layout]}>
                  <BingoGrid card={card} accentColor={config.accent} />
                </div>
              </div>

              {/* カード間区切り */}
              {i < cards.length - 1 && (
                <div className="h-px bg-gray-800 mx-4 mt-3" />
              )}
            </div>
          )
        })}
      </div>

      {/* フッター */}
      <div className="h-8" />
    </main>
  )
}

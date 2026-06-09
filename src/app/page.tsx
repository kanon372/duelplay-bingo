'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyCards, canAddCard } from '@/lib/localStorage'
import type { MyCard } from '@/types'

const CIV_COLOR: Record<string, string> = {
  光: 'border-yellow-500 text-yellow-300',
  水: 'border-blue-500 text-blue-300',
  火: 'border-red-500 text-red-300',
  自然: 'border-green-500 text-green-300',
  闇: 'border-purple-500 text-purple-300',
}

export default function TopPage() {
  const [cards, setCards] = useState<MyCard[]>([])

  useEffect(() => { setCards(getMyCards()) }, [])

  return (
    <main className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-black text-white text-center tracking-widest mb-6">BINGO</h1>
        {cards.length === 0 ? (
          <div className="text-center text-gray-400 mt-16">
            <div className="text-5xl mb-4">🎯</div>
            <p className="mb-2">まだカードがありません</p>
            <p className="text-sm">会場のQRコードをスキャンして</p>
            <p className="text-sm">ビンゴカードをゲットしよう！</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map(card => (
              <Link key={card.id} href={`/card/${card.id}`}
                className={`block border-2 rounded-lg p-4 bg-gray-800 hover:bg-gray-700 transition ${CIV_COLOR[card.civilization]}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold">{card.civilization}文明</span>
                  <span className="text-gray-400 text-sm">No.{card.id}</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">タップしてカードを開く →</p>
              </Link>
            ))}
          </div>
        )}
        {canAddCard() && cards.length > 0 && (
          <p className="text-center text-gray-500 text-sm mt-6">あと{3 - cards.length}枚追加できます</p>
        )}
      </div>
    </main>
  )
}

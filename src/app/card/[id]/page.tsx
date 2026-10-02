'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import BingoCardView from '@/components/BingoCardView'
import { fetchMyCardsWithCells } from '@/lib/session'
import type { BingoCard } from '@/types'

type State = { kind: 'loading' } | { kind: 'ok'; card: BingoCard } | { kind: 'not_found' } | { kind: 'error' }

export default function CardPage() {
  const params = useParams()
  const cardId = parseInt(params.id as string, 10)
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    // 自分のカードだけをサーバーから取得する（他人のカード番号を開いても表示されない）
    fetchMyCardsWithCells()
      .then(session => {
        if (!active) return
        const card = session?.cards.find(c => c.id === cardId)
        setState(card ? { kind: 'ok', card } : { kind: 'not_found' })
      })
      .catch(() => { if (active) setState({ kind: 'error' }) })
    return () => { active = false }
  }, [cardId])

  if (state.kind === 'loading') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-sm">読み込み中...</p>
      </main>
    )
  }

  if (state.kind !== 'ok') {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-gray-300">
          {state.kind === 'error'
            ? '通信エラーが発生しました。電波の良い場所でもう一度お試しください。'
            : 'このカードはあなたのカードではないか、見つかりませんでした。'}
        </p>
        <Link href="/" className="text-blue-400 underline text-sm">← マイカード一覧へ</Link>
      </main>
    )
  }

  const { card } = state
  return (
    <main className="min-h-screen bg-black flex flex-col">
      <BingoCardView card={card} />

      {/* カード番号 */}
      <div className="flex-1 bg-gray-950 px-4 py-3 flex flex-col gap-2">
        <p className="text-center text-gray-400 text-xs">
          {card.civilization}文明 No.{card.id}
        </p>
        <Link href="/" className="block text-center text-xs text-gray-500 underline">
          ← マイカード一覧へ
        </Link>
      </div>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import BingoCardView from '@/components/BingoCardView'
import ClaimPanel from '@/components/ClaimPanel'
import RecentDraws from '@/components/RecentDraws'
import { useDraws } from '@/lib/useDraws'
import { useMyCards } from '@/lib/useMyCards'

export default function CardPage() {
  const params = useParams()
  const cardId = parseInt(params.id as string, 10)
  // 自分のカードだけをサーバーから取得する（他人のカード番号を開いても表示されない）
  const { session, loading, error, refresh } = useMyCards()
  const draws = useDraws()

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-sm">読み込み中...</p>
      </main>
    )
  }

  const card = session?.cards.find(c => c.id === cardId)
  if (!session || !card) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-gray-300">
          {error
            ? '通信エラーが発生しました。電波の良い場所でもう一度お試しください。'
            : 'このカードはあなたのカードではないか、見つかりませんでした。'}
        </p>
        <Link href="/" className="text-blue-400 underline text-sm">← マイカード一覧へ</Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <BingoCardView card={card} drawn={draws.drawn} fresh={draws.fresh} />

      <div className="flex-1 bg-gray-950 px-4 py-3 flex flex-col gap-3">
        <ClaimPanel
          card={card}
          drawn={draws.drawn}
          gameStatus={draws.status}
          claims={session.claims}
          participantNo={session.participantNo}
          onChanged={refresh}
        />
        <RecentDraws order={draws.order} stale={draws.stale} />
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { addMyCard, canAddCard, getMyCards, getParticipantNo, setParticipantNo } from '@/lib/localStorage'
import type { Civilization } from '@/types'

export default function AssignPage() {
  const router = useRouter()
  const params = useParams()
  const civilization = decodeURIComponent(params.civilization as string)
  const [status, setStatus] = useState<'loading' | 'full' | 'error' | 'sold_out'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!canAddCard()) { setStatus('full'); return }

    const assign = async () => {
      try {
        const res = await fetch('/api/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ civilization }),
        })
        if (res.status === 409) { setStatus('sold_out'); return }
        if (!res.ok) { setStatus('error'); setMessage('エラーが発生しました。スタッフにお声がけください。'); return }
        const { card } = await res.json()
        const isFirstCard = getMyCards().length === 0
        addMyCard({ id: card.id, civilization: card.civilization as Civilization })

        // 初回カード取得時に参加者番号を登録（カードリセット後も番号を引き継ぐ）
        if (isFirstCard) {
          try {
            const existingParticipantNo = getParticipantNo()
            const pRes = await fetch('/api/participant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardId: card.id, existingParticipantNo }),
            })
            const pData = await pRes.json()
            if (pData.error) console.error('参加者登録エラー:', pData.error)
            if (pData.participantNo) setParticipantNo(pData.participantNo)
          } catch (e) { console.error('参加者番号取得失敗:', e) }
        }

        router.replace(`/card/${card.id}`)
      } catch {
        setStatus('error')
        setMessage('通信エラーが発生しました。')
      }
    }
    assign()
  }, [civilization, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p>カードを準備しています...</p>
        </div>
      </div>
    )
  }
  if (status === 'full') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">🃏</div>
          <h1 className="text-xl font-bold mb-2">カードは3枚までです</h1>
          <p className="text-gray-400 mb-4 text-sm">すでに3枚のカードをお持ちです</p>
          <a href="/" className="text-blue-400 underline text-sm">マイカード一覧へ</a>
        </div>
      </div>
    )
  }
  if (status === 'sold_out') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">😢</div>
          <h1 className="text-xl font-bold mb-2">{civilization}文明のカードは終了しました</h1>
          <p className="text-gray-400 text-sm">他の文明をお試しください</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white"><p className="text-red-400">{message}</p></div>
    </div>
  )
}

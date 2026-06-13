'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { addMyCard, canAddCard, getMyCards, getParticipantNo, setParticipantNo } from '@/lib/localStorage'
import type { Civilization } from '@/types'

const STAMP_REQUIRED = [0, 2, 3] // 1枚目:0個, 2枚目:2個, 3枚目:3個

export default function AssignPage() {
  const router = useRouter()
  const params = useParams()
  const civilization = decodeURIComponent(params.civilization as string)
  const [status, setStatus] = useState<'loading' | 'full' | 'error' | 'sold_out' | 'stamp_required'>('loading')
  const [message, setMessage] = useState('')
  const [requiredStamps, setRequiredStamps] = useState(0)
  const [currentStamps, setCurrentStamps] = useState(0)

  useEffect(() => {
    if (!canAddCard()) { setStatus('full'); return }

    const assign = async () => {
      // スタンプ条件チェック
      const myCards = getMyCards()
      const nextIndex = myCards.length
      const required = STAMP_REQUIRED[nextIndex] ?? 99
      if (required > 0) {
        const participantNo = getParticipantNo()
        if (!participantNo) {
          setRequiredStamps(required)
          setCurrentStamps(0)
          setStatus('stamp_required')
          return
        }
        const stampRes = await fetch(`/api/stamp?participantNo=${participantNo}&t=${Date.now()}`)
        const stampData = await stampRes.json()
        const count = [stampData.stamp_ad, stampData.stamp_nd, stampData.stamp_rental].filter(Boolean).length
        if (count < required) {
          setRequiredStamps(required)
          setCurrentStamps(count)
          setStatus('stamp_required')
          return
        }
      }

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
  if (status === 'stamp_required') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold mb-2">スタンプが足りません</h1>
          <p className="text-gray-400 mb-1 text-sm">
            次のカードには<span className="text-yellow-400 font-bold">スタンプ{requiredStamps}個</span>必要です
          </p>
          <p className="text-gray-500 mb-4 text-sm">現在: {currentStamps}個</p>
          <p className="text-gray-400 text-xs mb-6">スタッフにお声がけいただくとスタンプを押してもらえます</p>
          <a href="/" className="text-blue-400 underline text-sm">マイカード一覧へ戻る</a>
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyCards, canAddCard, removeCard, getParticipantNo, setParticipantNo } from '@/lib/localStorage'
import type { MyCard } from '@/types'
import dynamic from 'next/dynamic'
import StampCard from '@/components/StampCard'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

const CIV_COLOR: Record<string, string> = {
  光: 'border-yellow-500 text-yellow-300',
  水: 'border-blue-500 text-blue-300',
  火: 'border-red-500 text-red-300',
  自然: 'border-green-500 text-green-300',
  闇: 'border-purple-500 text-purple-300',
}

// 次のカードを取得するために必要なスタンプ数
const STAMP_REQUIRED = [0, 2, 3] // 1枚目:0個, 2枚目:2個, 3枚目:3個

interface StampStatus { stamp_ad: boolean; stamp_nd: boolean; stamp_rental: boolean }

export default function TopPage() {
  const [cards, setCards] = useState<MyCard[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [participantNo, setParticipantNoState] = useState<number | null>(null)
  const [stampStatus, setStampStatus] = useState<StampStatus | null>(null)

  useEffect(() => {
    const localCards = getMyCards()
    setCards(localCards)
    setMounted(true)
    const currentNo = getParticipantNo()
    setParticipantNoState(currentNo)

    // スタンプ状態を取得
    if (currentNo) {
      fetch(`/api/stamp?participantNo=${currentNo}&t=${Date.now()}`)
        .then(r => r.json())
        .then(data => setStampStatus(data))
        .catch(() => {})
    }

    // カードの有効性確認 → 有効なカードがある場合のみ参加者登録（順番に実行して競合防止）
    if (localCards.length > 0) {
      fetch('/api/check-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: localCards.map(c => c.id) }),
      })
        .then(r => r.json())
        .then(({ validIds }: { validIds: number[] }) => {
          const invalidCards = localCards.filter(c => !validIds.includes(c.id))
          if (invalidCards.length > 0) {
            invalidCards.forEach(c => removeCard(c.id))
            setCards(getMyCards())
          }

          const validCards = localCards.filter(c => validIds.includes(c.id))
          if (validCards.length === 0) return

          return fetch('/api/participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: validCards[0].id }),
          }).then(r => r.json())
        })
        .then((data: { participantNo?: number } | void) => {
          if (data?.participantNo) {
            const latestNo = getParticipantNo()
            if (!latestNo || latestNo === data.participantNo) {
              setParticipantNo(data.participantNo)
              setParticipantNoState(data.participantNo)
            }
          }
        })
        .catch(() => {})
    }
  }, [])

  const canAdd = mounted ? canAddCard() : true

  // スタンプ数チェック：次のカードに必要なスタンプが足りているか
  const stampCount = stampStatus
    ? [stampStatus.stamp_ad, stampStatus.stamp_nd, stampStatus.stamp_rental].filter(Boolean).length
    : 0
  const nextCardIndex = cards.length // 0=1枚目, 1=2枚目, 2=3枚目
  const requiredStamps = STAMP_REQUIRED[nextCardIndex] ?? 99
  const hasEnoughStamps = stampCount >= requiredStamps

  // スキャンできる条件：カード上限未満 かつ スタンプ条件を満たしている
  const canScan = canAdd && (cards.length === 0 || hasEnoughStamps)

  return (
    <main className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-black text-white text-center tracking-widest mb-6">BINGO</h1>

        {/* 参加者番号 */}
        {mounted && participantNo && (
          <div className="mb-4 rounded-xl bg-gray-800 border border-gray-600 px-4 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">参加者番号</span>
            <span className="text-white font-black text-2xl tracking-widest">#{participantNo}</span>
          </div>
        )}

        {/* QRスキャンボタン */}
        {mounted && canAdd && (
          canScan ? (
            <button
              onClick={() => setShowScanner(true)}
              className="w-full mb-6 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📷</span>
              QRコードを読み取る
              <span className="text-sm font-normal opacity-80 ml-1">（残り{3 - cards.length}枚）</span>
            </button>
          ) : (
            <div className="w-full mb-6 py-4 rounded-xl font-bold text-lg bg-gray-700 text-gray-500 flex flex-col items-center justify-center gap-1 cursor-not-allowed">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                QRコードを読み取る
                <span className="text-sm font-normal opacity-60 ml-1">（残り{3 - cards.length}枚）</span>
              </div>
              <span className="text-xs font-normal text-gray-400">
                {nextCardIndex + 1}枚目にはスタンプが{requiredStamps}個必要です（現在{stampCount}個）
              </span>
            </div>
          )
        )}

        {/* スタンプカード (参加者番号があるとき表示) */}
        {mounted && participantNo && (
          <StampCard participantNo={participantNo} onStampUpdate={setStampStatus} />
        )}

        {/* まとめて見るボタン (2枚以上のとき表示) */}
        {cards.length >= 2 && (
          <Link
            href="/cards/all"
            className="block w-full mb-4 py-3 rounded-xl font-bold text-sm bg-gray-700 text-gray-200 text-center hover:bg-gray-600 active:scale-95 transition-transform"
          >
            📋 全カードをまとめて見る
          </Link>
        )}

        {/* カード一覧 */}
        {cards.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-5xl mb-4">🎯</div>
            <p className="mb-2">まだカードがありません</p>
            <p className="text-sm">上のボタンからQRコードをスキャンして</p>
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

        {/* 上限に達した場合 */}
        {!canAdd && (
          <div className="text-center text-gray-500 text-sm mt-6 p-3 border border-gray-700 rounded-lg">
            🃏 カードは3枚まで取得できます
          </div>
        )}
      </div>

      {/* QRスキャナーモーダル */}
      {showScanner && (
        <QRScanner onClose={() => {
          setShowScanner(false)
          setCards(getMyCards())
          setParticipantNoState(getParticipantNo())
        }} />
      )}
    </main>
  )
}

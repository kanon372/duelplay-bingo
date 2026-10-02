'use client'

import { useMemo, useState } from 'react'
import { completedLinesByDraws } from '@/lib/bingo'
import { getToken } from '@/lib/localStorage'
import type { MyClaim } from '@/lib/session'
import type { BingoCard } from '@/types'

interface ClaimPanelProps {
  card: BingoCard
  drawn: ReadonlySet<string>
  gameStatus: 'open' | 'closed'
  claims: MyClaim[]
  participantNo: number
  /** 申告後・状況の更新が必要なときに呼ぶ（サーバーから状態を取り直す） */
  onChanged: () => void
}

/** ビンゴ申告ボタンと、申告後の状況（受付順位・確認中・景品GET）の表示 */
export default function ClaimPanel({ card, drawn, gameStatus, claims, participantNo, onChanged }: ClaimPanelProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const lineCount = useMemo(() => completedLinesByDraws(card.cells, drawn).length, [card.cells, drawn])
  const mine = claims.find(c => c.card_id === card.id)
  const otherActive = claims.find(c => c.card_id !== card.id && c.status !== 'rejected')

  const claim = async () => {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/bingo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: getToken(), cardId: card.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) setMessage('参加者情報を確認できませんでした。トップ画面からやり直してください。')
      else if (!res.ok) setMessage('通信エラーが発生しました。もう一度押してください。')
      else if (data.status === 'not_bingo') setMessage('まだビンゴが成立していません。出たカードの反映を待ってもう一度押してください。')
      else if (data.status === 'closed') setMessage('ビンゴの受付は終了しました。')
      else if (data.status === 'not_owner') setMessage('このカードはあなたのカードではありません。')
      // ok / already は下で状態を取り直して表示する
      onChanged()
    } catch {
      setMessage('通信エラーが発生しました。電波の良い場所でもう一度押してください。')
    }
    setBusy(false)
  }

  if (mine?.status === 'approved') {
    return (
      <div className="rounded-xl border-2 border-yellow-400 bg-yellow-900/40 p-4 text-center">
        <div className="text-4xl mb-1">🏆</div>
        <p className="text-yellow-300 font-black text-lg">景品GET！</p>
        <p className="text-gray-200 text-sm mt-1">受付 {mine.rank} 位 ・ 参加者番号 #{participantNo}</p>
        <p className="text-gray-300 text-xs mt-2">この画面をスタッフにお見せください</p>
      </div>
    )
  }
  if (mine?.status === 'pending') {
    return (
      <div className="rounded-xl border-2 border-blue-400 bg-blue-900/30 p-4 text-center">
        <div className="text-3xl mb-1">⏳</div>
        <p className="text-blue-200 font-black">ビンゴ申告を受け付けました</p>
        <p className="text-white text-2xl font-black mt-1">現在 {mine.rank} 位</p>
        <p className="text-gray-300 text-xs mt-2">スタッフが確認しています。参加者番号 #{participantNo}</p>
      </div>
    )
  }
  if (mine?.status === 'rejected') {
    return (
      <div className="rounded-xl border-2 border-red-500 bg-red-900/30 p-4 text-center">
        <p className="text-red-300 font-black">申告を確認できませんでした</p>
        <p className="text-gray-300 text-xs mt-1">スタッフにお声がけください（参加者番号 #{participantNo}）</p>
      </div>
    )
  }

  if (lineCount === 0) return null

  if (otherActive) {
    return <p className="text-center text-gray-400 text-sm">別のカードですでにビンゴ申告済みです</p>
  }
  if (gameStatus === 'closed') {
    return <p className="text-center text-gray-400 text-sm">ビンゴの受付は終了しました</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={claim}
        disabled={busy}
        className="claim-pulse w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xl shadow-lg active:scale-95 disabled:opacity-60"
      >
        {busy ? '送信中...' : `🎉 ビンゴ申告！（${lineCount}ライン）`}
      </button>
      {message && <p className="text-center text-red-300 text-xs">{message}</p>}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { clearSession, getToken, setParticipantNo, setToken } from '@/lib/localStorage'
import { syncSession } from '@/lib/session'

type Status = 'loading' | 'invalid' | 'full' | 'error' | 'sold_out' | 'stamp_required'

interface ClaimResponse {
  status: 'ok' | 'full' | 'sold_out' | 'stamp_required' | 'invalid_code' | 'no_participant'
  card?: { id: number; civilization: string }
  participantNo?: number
  token?: string
  required?: number
  current?: number
}

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string
  const civilization = decodeURIComponent(params.civilization as string)
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const [requiredStamps, setRequiredStamps] = useState(0)
  const [currentStamps, setCurrentStamps] = useState(0)
  const [participantNo, setParticipantNoState] = useState<number | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // React StrictMode の二重実行などでカードを2枚取らないようにする
    if (started.current) return
    started.current = true

    const claim = async () => {
      try {
        const res = await fetch('/api/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, civilization, token: getToken() }),
        })
        if (res.status === 403) { setStatus('invalid'); return }
        if (!res.ok) {
          setStatus('error')
          setMessage('エラーが発生しました。スタッフにお声がけください。')
          return
        }
        const data: ClaimResponse = await res.json()

        // サーバーが発行した（または確認した）トークンを保存。トークンが変わった場合は古い端末内の状態を捨てる
        if (data.token) {
          if (getToken() !== data.token) clearSession()
          setToken(data.token)
        }
        if (data.participantNo) {
          setParticipantNo(data.participantNo)
          setParticipantNoState(data.participantNo)
        }

        switch (data.status) {
          case 'ok':
            // 端末のカード一覧をサーバーの内容に合わせてから、受け取ったカードを開く
            await syncSession().catch(() => {})
            router.replace(`/card/${data.card!.id}`)
            return
          case 'full': setStatus('full'); return
          case 'sold_out': setStatus('sold_out'); return
          case 'stamp_required':
            setRequiredStamps(data.required ?? 0)
            setCurrentStamps(data.current ?? 0)
            setStatus('stamp_required')
            return
          default:
            setStatus('error')
            setMessage('エラーが発生しました。スタッフにお声がけください。')
        }
      } catch {
        setStatus('error')
        setMessage('通信エラーが発生しました。電波の良い場所でもう一度お試しください。')
      }
    }
    claim()
  }, [code, civilization, router])

  if (status === 'loading') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p>カードを準備しています...</p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-5xl mb-4">⛔</div>
        <h1 className="text-xl font-bold mb-2">このQRは使用できません</h1>
        <p className="text-gray-400 text-sm">このQRコードは別のイベント用です。<br />スタッフにお声がけください。</p>
      </div>
    </div>
  )

  if (status === 'stamp_required') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold mb-2">スタンプが足りません</h1>
        <p className="text-gray-400 mb-1 text-sm">次のカードには<span className="text-yellow-400 font-bold">スタンプ{requiredStamps}個</span>必要です</p>
        <p className="text-gray-500 mb-4 text-sm">現在: {currentStamps}個</p>
        {participantNo && <p className="text-gray-300 text-sm mb-2">参加者番号 <span className="font-black text-lg">#{participantNo}</span></p>}
        <p className="text-gray-400 text-xs mb-6">スタッフにお声がけいただくとスタンプを押してもらえます</p>
        <Link href="/" className="text-blue-400 underline text-sm">マイカード一覧へ戻る</Link>
      </div>
    </div>
  )

  if (status === 'full') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-5xl mb-4">🃏</div>
        <h1 className="text-xl font-bold mb-2">カードは3枚までです</h1>
        <p className="text-gray-400 mb-4 text-sm">すでに3枚のカードをお持ちです</p>
        <Link href="/" className="text-blue-400 underline text-sm">マイカード一覧へ</Link>
      </div>
    </div>
  )

  if (status === 'sold_out') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="text-5xl mb-4">😢</div>
        <h1 className="text-xl font-bold mb-2">{civilization}文明のカードは終了しました</h1>
        <p className="text-gray-400 text-sm">他の文明をお試しください</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center text-white"><p className="text-red-400">{message}</p></div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { setParticipantNo, addMyCard } from '@/lib/localStorage'
import type { Civilization } from '@/types'

export default function RestorePage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const no = Number(params.no)
    if (isNaN(no) || no <= 0) { setErrorMsg('無効な参加者番号です'); setStatus('error'); return }

    fetch(`/api/restore?participantNo=${no}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setStatus('error'); return }
        setParticipantNo(data.participantNo)
        addMyCard({ id: data.card.id, civilization: data.card.civilization as Civilization })
        setStatus('done')
        setTimeout(() => router.replace('/'), 1500)
      })
      .catch(() => { setErrorMsg('通信エラーが発生しました'); setStatus('error') })
  }, [params.no, router])

  if (status === 'loading') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p>復元しています...</p>
      </div>
    </div>
  )

  if (status === 'done') return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">✅</div>
        <p className="font-bold text-lg">復元しました</p>
        <p className="text-gray-400 text-sm mt-1">マイカード画面に移動します...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-red-400 mb-4">{errorMsg}</p>
        <a href="/" className="text-blue-400 underline text-sm">トップへ戻る</a>
      </div>
    </div>
  )
}

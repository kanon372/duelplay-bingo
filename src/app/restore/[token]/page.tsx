'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clearSession, setToken } from '@/lib/localStorage'
import { syncSession } from '@/lib/session'

/** スタッフが発行した復元用QR（/restore/[秘密トークン]）を開くと、参加者の状態を端末に復元する */
export default function RestorePage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = String(params.token ?? '')
    clearSession()
    setToken(token)
    syncSession()
      .then(session => {
        if (!session) { setErrorMsg('この復元用QRは無効です。スタッフにお声がけください。'); setStatus('error'); return }
        setStatus('done')
        setTimeout(() => router.replace('/'), 1500)
      })
      .catch(() => { setErrorMsg('通信エラーが発生しました'); setStatus('error') })
  }, [params.token, router])

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
        <Link href="/" className="text-blue-400 underline text-sm">トップへ戻る</Link>
      </div>
    </div>
  )
}

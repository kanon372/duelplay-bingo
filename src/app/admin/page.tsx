'use client'

import { useState, useCallback } from 'react'

interface CardSummary { civilization: string; total: number; assigned: number; remaining: number }
interface CardInfo { id: number; civilization: string; assigned: boolean; assigned_at: string | null }

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [summary, setSummary] = useState<CardSummary[]>([])
  const [cards, setCards] = useState<CardInfo[]>([])
  const [message, setMessage] = useState('')
  const [resetCardId, setResetCardId] = useState('')

  const fetchData = useCallback(async (pw: string) => {
    const res = await fetch('/api/admin/cards', { headers: { 'x-admin-password': pw } })
    if (res.status === 401) { setAuthError('パスワードが違います'); setAuthed(false); return }
    const data = await res.json()
    setSummary(data.summary)
    setCards(data.cards)
    setAuthed(true)
  }, [])

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); setAuthError(''); fetchData(password) }

  const handleReset = async (cardId?: number) => {
    const body = cardId ? { cardId } : { resetAll: true }
    if (!confirm(cardId ? `カード${cardId}を未配布に戻しますか？` : '全カードをリセットしますか？')) return
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setMessage(data.message ?? data.error)
    fetchData(password)
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm">
          <h1 className="text-white text-2xl font-bold text-center mb-6">管理画面</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="パスワード" className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 mb-3" />
          {authError && <p className="text-red-400 text-sm mb-2">{authError}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-500">ログイン</button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-2xl font-bold mb-4">管理画面</h1>
        {message && <div className="bg-green-800 text-green-200 p-3 rounded mb-4 text-sm">{message}</div>}
        <section className="mb-6">
          <h2 className="text-gray-300 font-bold mb-2">配布状況</h2>
          <div className="grid grid-cols-5 gap-2">
            {summary.map(s => (
              <div key={s.civilization} className="bg-gray-800 rounded p-3 text-center">
                <div className="text-white font-bold text-sm">{s.civilization}</div>
                <div className="text-green-400 text-xs mt-1">残り {s.remaining}</div>
                <div className="text-gray-400 text-xs">配布 {s.assigned}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h2 className="text-gray-300 font-bold mb-2">カード単体を未配布に戻す</h2>
          <div className="flex gap-2">
            <input type="number" value={resetCardId} onChange={e => setResetCardId(e.target.value)}
              placeholder="カード番号（例: 42）" className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-600 text-sm" />
            <button onClick={() => handleReset(parseInt(resetCardId, 10))}
              className="px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-500">戻す</button>
          </div>
        </section>
        <section className="mb-6">
          <h2 className="text-gray-300 font-bold mb-2">配布済みカード一覧</h2>
          <div className="bg-gray-800 rounded overflow-hidden max-h-64 overflow-y-auto">
            {cards.filter(c => c.assigned).map(card => (
              <div key={card.id} className="flex items-center justify-between px-3 py-2 border-b border-gray-700 text-sm">
                <span className="text-white">No.{card.id} {card.civilization}</span>
                <button onClick={() => handleReset(card.id)} className="text-yellow-400 text-xs hover:underline">未配布に戻す</button>
              </div>
            ))}
          </div>
        </section>
        <section>
          <button onClick={() => handleReset()} className="w-full py-3 bg-red-700 text-white rounded font-bold hover:bg-red-600">
            ⚠️ 全カードをリセット
          </button>
        </section>
      </div>
    </main>
  )
}

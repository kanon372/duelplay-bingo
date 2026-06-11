'use client'

import { useState, useCallback } from 'react'

interface CardSummary { civilization: string; total: number; assigned: number; remaining: number }
interface CardInfo { id: number; civilization: string; assigned: boolean; assigned_at: string | null }
interface ParticipantStamps { stamp_ad: boolean; stamp_nd: boolean; stamp_rental: boolean }
interface Participant {
  id: number
  primary_card_id: number
  created_at: string
  participant_stamps: ParticipantStamps | ParticipantStamps[] | null
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [summary, setSummary] = useState<CardSummary[]>([])
  const [cards, setCards] = useState<CardInfo[]>([])
  const [message, setMessage] = useState('')
  const [resetCardId, setResetCardId] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // スタンプ管理（参加者番号ベース）
  const [stampParticipantNo, setStampParticipantNo] = useState('')
  const [stampStatus, setStampStatus] = useState<{ stamp_ad: boolean; stamp_nd: boolean; stamp_rental: boolean } | null>(null)
  const [stampLoading, setStampLoading] = useState(false)
  const [stampMessage, setStampMessage] = useState('')

  // 参加者一覧
  const [participants, setParticipants] = useState<Participant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)

  const fetchData = useCallback(async (pw: string) => {
    const res = await fetch('/api/admin/cards', { headers: { 'x-admin-password': pw } })
    if (res.status === 401) { setAuthError('パスワードが違います'); setAuthed(false); return }
    const data = await res.json()
    setSummary(data.summary)
    setCards(data.cards)
    setAuthed(true)
    setLastUpdated(new Date())
    // 参加者一覧も同時に更新
    const pRes = await fetch('/api/admin/participants', { headers: { 'x-admin-password': pw } })
    const pData = await pRes.json()
    if (!pData.error) setParticipants(pData.participants ?? [])
  }, [])

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); setAuthError(''); fetchData(password) }

  const fetchStamp = async (pNo: string) => {
    if (!pNo) return
    setStampLoading(true)
    setStampMessage('')
    const res = await fetch(`/api/admin/stamp?participantNo=${pNo}`, { headers: { 'x-admin-password': password } })
    const data = await res.json()
    if (data.error) {
      setStampMessage('エラー: ' + data.error)
      setStampStatus(null)
      setStampLoading(false)
      return
    }
    setStampStatus(data)
    setStampLoading(false)
  }

  const toggleStamp = async (stamp: string, current: boolean) => {
    const pNo = parseInt(stampParticipantNo, 10)
    if (isNaN(pNo) || pNo <= 0) { setStampMessage('有効な参加者番号を入力してください'); return }
    setStampLoading(true)
    setStampMessage('')
    const res = await fetch('/api/admin/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ participantNo: pNo, stamp, value: !current }),
    })
    const data = await res.json()
    if (data.success) {
      setStampMessage(!current ? `スタンプを付与しました ✅（参加者 #${data.participantNo}）` : `スタンプを取消しました（参加者 #${data.participantNo}）`)
      await fetchStamp(stampParticipantNo)
    } else {
      setStampMessage('エラー: ' + data.error)
    }
    setStampLoading(false)
  }

  const fetchParticipants = async () => {
    setParticipantsLoading(true)
    try {
      const res = await fetch('/api/admin/participants', { headers: { 'x-admin-password': password } })
      const data = await res.json()
      if (data.error) {
        alert('参加者取得エラー: ' + data.error)
        setParticipantsLoading(false)
        return
      }
      setParticipants(data.participants ?? [])
    } catch (e) {
      alert('参加者取得失敗: ' + e)
    }
    setParticipantsLoading(false)
  }

  const deleteParticipant = async (participantNo: number) => {
    if (!confirm(`参加者 #${participantNo} を削除しますか？\nスタンプデータも削除されます。`)) return
    const res = await fetch('/api/admin/participants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ participantNo }),
    })
    const data = await res.json()
    if (data.success) {
      setParticipants(prev => prev.filter(p => p.id !== participantNo))
    } else {
      alert('削除失敗: ' + data.error)
    }
  }

  const handleReset = async (cardId?: number) => {
    if (cardId !== undefined && (isNaN(cardId) || cardId <= 0)) {
      setMessage('有効なカード番号を入力してください')
      return
    }
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-2xl font-bold">管理画面</h1>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-gray-500 text-xs">
                {lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 更新
              </span>
            )}
            <button
              onClick={() => fetchData(password)}
              className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-600"
            >
              🔄 今すぐ更新
            </button>
          </div>
        </div>
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
        {/* スタンプ付与 */}
        <section className="mb-6">
          <h2 className="text-gray-300 font-bold mb-2">🎫 スタンプカード管理</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="number"
              value={stampParticipantNo}
              onChange={e => { setStampParticipantNo(e.target.value); setStampStatus(null); setStampMessage('') }}
              placeholder="参加者番号（例: 1）"
              className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-600 text-sm"
            />
            <button
              onClick={() => fetchStamp(stampParticipantNo)}
              disabled={!stampParticipantNo || stampLoading}
              className="px-4 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              確認
            </button>
          </div>
          {stampMessage && (
            <p className={`text-sm mb-2 ${stampMessage.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {stampMessage}
            </p>
          )}
          {stampStatus && (
            <div className="bg-gray-800 rounded p-3 space-y-2">
              <p className="text-blue-400 text-xs font-bold mb-1">参加者 #{stampParticipantNo}</p>
              {([
                { key: 'stamp_ad',     label: 'AD' },
                { key: 'stamp_nd',     label: 'ND' },
                { key: 'stamp_rental', label: 'Rental' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${stampStatus[key] ? 'text-green-400' : 'text-gray-400'}`}>
                    {stampStatus[key] ? '✅' : '○'} {label}
                  </span>
                  <button
                    onClick={() => toggleStamp(key, stampStatus[key])}
                    disabled={stampLoading}
                    className={`px-3 py-1 rounded text-xs font-bold disabled:opacity-50 ${
                      stampStatus[key]
                        ? 'bg-red-800 text-red-200 hover:bg-red-700'
                        : 'bg-green-700 text-white hover:bg-green-600'
                    }`}
                  >
                    {stampStatus[key] ? '取消' : '付与'}
                  </button>
                </div>
              ))}
              <p className="text-gray-500 text-xs pt-1">
                スタンプ数: {[stampStatus.stamp_ad, stampStatus.stamp_nd, stampStatus.stamp_rental].filter(Boolean).length} / 3
              </p>
            </div>
          )}
        </section>

        {/* 参加者一覧 */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-300 font-bold">👥 参加者一覧</h2>
            <button
              onClick={() => setShowParticipants(v => !v)}
              className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
            >
              {showParticipants ? '閉じる' : '表示する'}
            </button>
          </div>
          {showParticipants && (
            <div className="bg-gray-800 rounded overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-700">
                <span className="text-gray-400 text-xs">合計 {participants.length} 人</span>
              </div>
              {participants.length === 0 && !participantsLoading && (
                <p className="text-gray-500 text-sm p-3">参加者はまだいません</p>
              )}
              {participants.map(p => {
                // Supabaseはネスト結果を配列で返すことがある
                const stampsRaw = p.participant_stamps
                const stamps: ParticipantStamps | null = Array.isArray(stampsRaw)
                  ? (stampsRaw[0] ?? null)
                  : stampsRaw
                const count = stamps ? [stamps.stamp_ad, stamps.stamp_nd, stamps.stamp_rental].filter(Boolean).length : 0
                return (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-gray-700 text-sm">
                    <div>
                      <span className="text-white font-bold">#{p.id}</span>
                      <span className="text-gray-500 text-xs ml-2">カード No.{p.primary_card_id}</span>
                      <div className="flex gap-1 mt-0.5">
                        {(['AD','ND','Rental'] as const).map((label, i) => {
                          const keys = ['stamp_ad','stamp_nd','stamp_rental'] as const
                          const on = stamps?.[keys[i]] ?? false
                          return <span key={label} className={`text-xs px-1 rounded ${on ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-500'}`}>{label}</span>
                        })}
                        <span className="text-gray-500 text-xs ml-1">{count}/3</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteParticipant(p.id)}
                      className="text-red-400 text-xs hover:text-red-300 hover:underline ml-2"
                    >削除</button>
                  </div>
                )
              })}
            </div>
          )}
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
        <section className="mb-6">
          <h2 className="text-gray-300 font-bold mb-2">未配布カード一覧（残り）</h2>
          {(['光','水','火','自然','闇'] as const).map(civ => {
            const remaining = cards.filter(c => !c.assigned && c.civilization === civ)
            if (remaining.length === 0) return null
            return (
              <div key={civ} className="mb-3">
                <div className="text-gray-400 text-xs font-bold mb-1">{civ}文明 ({remaining.length}枚)</div>
                <div className="flex flex-wrap gap-1">
                  {remaining.map(card => (
                    <span key={card.id} className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1">
                      No.{card.id}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          {cards.filter(c => !c.assigned).length === 0 && (
            <p className="text-gray-500 text-sm">未配布カードはありません</p>
          )}
        </section>
        <section className="space-y-3">
          <button
            onClick={async () => {
              if (!confirm('スタンプ・参加者データを全削除しますか？\nビンゴカードの配布状況はそのまま残ります。')) return
              const res = await fetch('/api/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
                body: JSON.stringify({ resetStamps: true }),
              })
              const data = await res.json()
              setMessage(data.message ?? data.error)
            }}
            className="w-full py-3 bg-orange-700 text-white rounded font-bold hover:bg-orange-600"
          >
            🗑️ スタンプ・参加者をリセット
          </button>
          <button onClick={() => handleReset()} className="w-full py-3 bg-red-700 text-white rounded font-bold hover:bg-red-600">
            ⚠️ 全カードをリセット（配布状況のみ）
          </button>
        </section>
      </div>
    </main>
  )
}

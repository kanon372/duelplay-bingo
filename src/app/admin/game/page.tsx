'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { clearAdminPassword, getAdminPassword, setAdminPassword } from '@/lib/adminSession'

interface GameState { status: 'open' | 'closed'; prizeLimit: number; onePrizePerParticipant: boolean }
interface DrawRow { card_no: string; drawn_at: string }
interface ClaimView {
  id: number
  participantNo: number
  cardId: number
  civilization: string
  lines: number
  status: 'pending' | 'approved' | 'rejected'
  rank: number | null
  claimedAt: string
  validNow: boolean
}
interface GameResponse {
  game: GameState
  drawn: DrawRow[]
  cardNos: string[]
  claims: ClaimView[]
  approvedCount: number
}

const POLL_MS = 2000

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.15
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    setTimeout(() => ctx.close(), 400)
  } catch { /* 音が出せない環境は無視 */ }
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function GameConsolePage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [data, setData] = useState<GameResponse | null>(null)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [lastOk, setLastOk] = useState<Date | null>(null)
  const [offline, setOffline] = useState(false)
  const [flashNew, setFlashNew] = useState(false)
  const inflight = useRef(false)
  const claimCount = useRef<number | null>(null)

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password, ...(init?.headers ?? {}) },
      cache: 'no-store',
    })
    return res
  }, [password])

  const load = useCallback(async () => {
    if (inflight.current) return
    inflight.current = true
    try {
      const res = await api('/api/admin/game')
      if (res.status === 401 || res.status === 429) {
        setAuthed(false)
        setAuthError(res.status === 429 ? '試行回数が多すぎます。しばらくしてからやり直してください' : 'パスワードが違います')
        clearAdminPassword()
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const json: GameResponse = await res.json()
      setData(json)
      setAuthed(true)
      setAuthError('')
      setOffline(false)
      setLastOk(new Date())
      setAdminPassword(password)

      // 新しい申告が入ったら音と点滅で知らせる
      const pending = json.claims.filter(c => c.status === 'pending').length
      if (claimCount.current !== null && pending > claimCount.current) {
        beep()
        setFlashNew(true)
        setTimeout(() => setFlashNew(false), 2500)
      }
      claimCount.current = pending
    } catch {
      setOffline(true)
    } finally {
      inflight.current = false
    }
  }, [api, password])

  // 保存済みのパスワードがあれば自動でログイン（描画時ではなく、マウント後に読む）
  useEffect(() => {
    const saved = getAdminPassword()
    if (!saved) return
    let alive = true
    fetch('/api/admin/game', { headers: { 'x-admin-password': saved }, cache: 'no-store' })
      .then(async res => {
        if (!alive || !res.ok) return
        const json: GameResponse = await res.json()
        setPassword(saved)
        setData(json)
        setAuthed(true)
        setLastOk(new Date())
        claimCount.current = json.claims.filter(c => c.status === 'pending').length
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!authed) return
    const t = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => clearInterval(t)
  }, [authed, load])

  const drawnSet = useMemo(() => new Set((data?.drawn ?? []).map(d => d.card_no)), [data])

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 4000) }

  const toggleDraw = async (cardNo: string) => {
    if (!data) return
    const isDrawn = drawnSet.has(cardNo)
    if (isDrawn && !confirm(`カード ${cardNo} の「出た」を取り消しますか？`)) return
    // すぐ画面に反映し、失敗したら戻す
    setData({
      ...data,
      drawn: isDrawn
        ? data.drawn.filter(d => d.card_no !== cardNo)
        : [...data.drawn, { card_no: cardNo, drawn_at: new Date().toISOString() }],
    })
    const res = await api('/api/admin/draws', {
      method: 'POST',
      body: JSON.stringify({ cardNo, action: isDrawn ? 'remove' : 'add' }),
    })
    if (!res.ok) flash('入力に失敗しました。通信状況を確認してもう一度お試しください')
    load()
  }

  const undoLast = async () => {
    const last = data?.drawn[data.drawn.length - 1]
    if (last) await toggleDraw(last.card_no)
  }

  const patchGame = async (body: Partial<GameState>) => {
    const res = await api('/api/admin/game', { method: 'PATCH', body: JSON.stringify(body) })
    if (!res.ok) flash((await res.json().catch(() => ({}))).error ?? '設定の変更に失敗しました')
    load()
  }

  const decide = async (claimId: number, decision: 'approve' | 'reject' | 'pending') => {
    const res = await api('/api/admin/claims', { method: 'POST', body: JSON.stringify({ claimId, decision }) })
    if (!res.ok) flash((await res.json().catch(() => ({}))).error ?? '操作に失敗しました')
    load()
  }

  const resetGame = async () => {
    if (!confirm('ゲームをリセットしますか？\n出たカードと、全ての申告が削除されます。元に戻せません。')) return
    if (prompt('確認のため「リセット」と入力してください') !== 'リセット') return
    const res = await api('/api/admin/game', { method: 'DELETE', body: JSON.stringify({ confirm: 'reset' }) })
    const json = await res.json().catch(() => ({}))
    flash(json.message ?? json.error ?? 'リセットに失敗しました')
    claimCount.current = 0
    load()
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={e => { e.preventDefault(); setAuthError(''); load() }} className="w-full max-w-sm">
          <h1 className="text-white text-2xl font-bold text-center mb-6">ゲーム運営</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="パスワード" className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 mb-3" />
          {authError && <p className="text-red-400 text-sm mb-2">{authError}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-500">ログイン</button>
        </form>
      </main>
    )
  }

  const game = data!.game
  const claims = data!.claims
  const active = claims.filter(c => c.status !== 'rejected')
  const rejected = claims.filter(c => c.status === 'rejected')
  const remaining = Math.max(game.prizeLimit - data!.approvedCount, 0)
  const q = search.trim()
  const cardNos = data!.cardNos.filter(n => !q || n.includes(q))
  const recent = data!.drawn.slice(-8).reverse()

  return (
    <main className="min-h-screen bg-gray-900 p-3 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h1 className="text-white text-xl font-bold">🎮 ゲーム運営</h1>
          <div className="flex items-center gap-3 text-xs">
            <span className={offline ? 'text-orange-400' : 'text-gray-500'}>
              {offline ? '⚠ 通信できていません' : `${lastOk ? fmtTime(lastOk.toISOString()) : ''} 更新`}
            </span>
            <Link href="/admin" className="text-blue-400 underline">参加者・カード管理 →</Link>
          </div>
        </div>

        {message && <div className="bg-yellow-900 text-yellow-100 p-3 rounded mb-3 text-sm">{message}</div>}

        {/* 設定 */}
        <section className="bg-gray-800 rounded-lg p-3 mb-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            onClick={() => patchGame({ status: game.status === 'open' ? 'closed' : 'open' })}
            className={`px-4 py-2 rounded font-bold text-sm ${game.status === 'open' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}
          >
            {game.status === 'open' ? '● 受付中（押すと終了）' : '■ 受付終了（押すと再開）'}
          </button>
          <div className="flex items-center gap-2 text-white text-sm">
            <span className="text-gray-400">景品</span>
            <button onClick={() => patchGame({ prizeLimit: Math.max(game.prizeLimit - 1, 1) })} className="w-9 h-9 rounded bg-gray-700 text-lg">−</button>
            <span className="w-14 text-center font-black text-lg">{game.prizeLimit}人</span>
            <button onClick={() => patchGame({ prizeLimit: game.prizeLimit + 1 })} className="w-9 h-9 rounded bg-gray-700 text-lg">＋</button>
            <span className="text-gray-400 text-xs">残り {remaining}</span>
          </div>
          <label className="flex items-center gap-2 text-gray-300 text-sm">
            <input type="checkbox" checked={game.onePrizePerParticipant}
              onChange={e => patchGame({ onePrizePerParticipant: e.target.checked })} />
            1人1回まで
          </label>
          <button onClick={resetGame} className="ml-auto px-3 py-2 rounded bg-gray-700 text-red-300 text-xs">ゲームをリセット</button>
        </section>

        {/* 申告 */}
        <section className={`rounded-lg p-3 mb-3 border-2 ${flashNew ? 'border-yellow-400 bg-yellow-900/30' : 'border-gray-700 bg-gray-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-bold">🎉 ビンゴ申告（受付順）</h2>
            <span className="text-gray-400 text-xs">承認 {data!.approvedCount} / {game.prizeLimit}人</span>
          </div>
          {active.length === 0 && <p className="text-gray-500 text-sm py-3">まだ申告はありません</p>}
          <div className="flex flex-col gap-2">
            {active.map(c => {
              const inPrize = (c.rank ?? 999) <= game.prizeLimit
              return (
                <div key={c.id}
                  className={`rounded p-2 flex flex-wrap items-center gap-x-3 gap-y-2 ${c.status === 'approved' ? 'bg-green-900/50' : inPrize ? 'bg-gray-700' : 'bg-gray-700/60'}`}>
                  <span className={`w-12 text-center text-2xl font-black ${inPrize ? 'text-yellow-300' : 'text-gray-400'}`}>{c.rank}位</span>
                  <div className="text-white text-sm">
                    <div className="font-bold">参加者 #{c.participantNo}</div>
                    <div className="text-gray-300 text-xs">{c.civilization} No.{c.cardId} ・ {c.lines}ライン ・ {fmtTime(c.claimedAt)}</div>
                  </div>
                  {!c.validNow && (
                    <span className="text-xs bg-red-800 text-red-100 rounded px-2 py-1">いまはビンゴ不成立（出たカードが取り消されています）</span>
                  )}
                  <div className="ml-auto flex gap-2">
                    {c.status === 'approved' ? (
                      <>
                        <span className="px-3 py-2 rounded bg-green-700 text-white text-sm font-bold">✅ 承認済み</span>
                        <button onClick={() => decide(c.id, 'pending')} className="px-3 py-2 rounded bg-gray-600 text-gray-200 text-xs">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => decide(c.id, 'approve')} className="px-4 py-2 rounded bg-green-600 text-white font-bold text-sm active:scale-95">承認</button>
                        <button onClick={() => decide(c.id, 'reject')} className="px-4 py-2 rounded bg-red-700 text-white text-sm active:scale-95">却下</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {rejected.length > 0 && (
            <details className="mt-3">
              <summary className="text-gray-500 text-xs cursor-pointer">却下した申告 {rejected.length}件</summary>
              {rejected.map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs text-gray-500 py-1">
                  <span>#{c.participantNo} ・ {c.civilization} No.{c.cardId} ・ {fmtTime(c.claimedAt)}</span>
                  <button onClick={() => decide(c.id, 'pending')} className="underline text-gray-400">未判定に戻す</button>
                </div>
              ))}
            </details>
          )}
        </section>

        {/* 出たカード入力 */}
        <section className="bg-gray-800 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-white font-bold">🃏 出たカードの入力</h2>
            <span className="text-gray-400 text-xs">{data!.drawn.length} / {data!.cardNos.length}枚</span>
            <input value={search} onChange={e => setSearch(e.target.value)} inputMode="numeric" placeholder="番号で絞り込み"
              className="ml-auto p-2 rounded bg-gray-900 text-white border border-gray-600 text-sm w-40" />
          </div>
          <div className="flex items-center gap-2 mb-3 overflow-x-auto">
            <button onClick={undoLast} disabled={recent.length === 0}
              className="shrink-0 px-3 py-2 rounded bg-gray-700 text-gray-200 text-xs disabled:opacity-40">↩ 直前を取消</button>
            {recent.length === 0 && <span className="text-gray-500 text-xs">まだ入力がありません</span>}
            {recent.map((d, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={d.card_no} src={`/cards/${d.card_no}.webp`} alt={d.card_no} width={34} height={48}
                className={`rounded-sm shrink-0 ${i === 0 ? 'ring-2 ring-yellow-400' : ''}`} />
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {cardNos.map(no => {
              const on = drawnSet.has(no)
              return (
                <button key={no} onClick={() => toggleDraw(no)}
                  className={`relative rounded overflow-hidden border-2 active:scale-95 ${on ? 'border-green-400' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/cards/${no}.webp`} alt={no} loading="lazy" className={`w-full block ${on ? 'opacity-40' : ''}`} />
                  {on && <span className="absolute inset-0 flex items-center justify-center text-green-300 text-3xl font-black">✓</span>}
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] leading-tight py-0.5">{no}</span>
                </button>
              )
            })}
          </div>
          {cardNos.length === 0 && <p className="text-gray-500 text-sm py-3">該当するカードがありません</p>}
        </section>
      </div>
    </main>
  )
}

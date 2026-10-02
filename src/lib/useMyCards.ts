'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchMyCardsWithCells, type SessionWithCells } from '@/lib/session'

const PENDING_POLL_MS = 5000

/**
 * 自分のカード（25マス込み）・申告の状況をサーバーから取得する。
 * 申告が「確認待ち」の間だけ、承認・却下の結果を受け取るために数秒おきに再取得する。
 */
export function useMyCards() {
  const [session, setSession] = useState<SessionWithCells | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const s = await fetchMyCardsWithCells()
      setSession(s)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初回の取得（状態の更新は取得の完了後にだけ行う）
  useEffect(() => {
    let alive = true
    fetchMyCardsWithCells()
      .then(s => { if (alive) { setSession(s); setError(false) } })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const hasPending = session?.claims.some(c => c.status === 'pending') ?? false
  useEffect(() => {
    if (!hasPending) return
    const t = setInterval(() => { if (!document.hidden) refresh() }, PENDING_POLL_MS)
    return () => clearInterval(t)
  }, [hasPending, refresh])

  return { session, loading, error, refresh }
}

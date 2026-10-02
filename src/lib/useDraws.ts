'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export interface DrawsState {
  /** 出たカードの番号（出た順） */
  order: string[]
  drawn: Set<string>
  status: 'open' | 'closed'
  prizeLimit: number
  loaded: boolean
  /** 直前の更新で新しく出たカード（数秒で空に戻る。マスを光らせる演出用） */
  fresh: Set<string>
  /** 通信エラーが続いている（表示が古い可能性がある） */
  stale: boolean
}

const EMPTY: ReadonlySet<string> = new Set()

const BASE_INTERVAL_MS = 3000
const MAX_BACKOFF_MS = 15000

/**
 * 出たカード一覧を数秒おきに取得する。
 * - 画面が見えていない間は止め、戻ったらすぐ取得する（4000人が同時に開いていても無駄打ちしない）
 * - 通信エラー時は間隔を延ばす。全員の取得タイミングが揃わないよう少しばらつかせる
 */
export function useDraws(): DrawsState {
  const [data, setData] = useState<{ order: string[]; status: 'open' | 'closed'; prizeLimit: number } | null>(null)
  const [stale, setStale] = useState(false)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const failures = useRef(0)
  const known = useRef<ReadonlySet<string> | null>(null)
  const freshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined

    const schedule = () => {
      if (!active) return
      const base = Math.min(BASE_INTERVAL_MS * 2 ** failures.current, MAX_BACKOFF_MS)
      timer = setTimeout(tick, base + Math.random() * 1000)
    }

    const tick = async () => {
      if (!active) return
      if (document.hidden) { schedule(); return }
      try {
        const res = await fetch('/api/draws')
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!active) return
        failures.current = 0
        setStale(false)
        const order: string[] = json.drawn ?? []
        // 初回取得は「新しく出た」扱いにしない（開いた瞬間に全マスが光らないように）
        if (known.current) {
          const added = order.filter(n => !known.current!.has(n))
          if (added.length > 0) {
            setFresh(new Set(added))
            clearTimeout(freshTimer.current)
            freshTimer.current = setTimeout(() => setFresh(new Set()), 2500)
          }
        }
        known.current = new Set(order)
        setData({ order, status: json.status === 'closed' ? 'closed' : 'open', prizeLimit: json.prizeLimit ?? 1 })
      } catch {
        failures.current = Math.min(failures.current + 1, 3)
        if (active && failures.current >= 2) setStale(true)
      }
      schedule()
    }

    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer)
        tick()
      }
    }

    tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      clearTimeout(timer)
      clearTimeout(freshTimer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return useMemo(
    () => ({
      order: data?.order ?? [],
      drawn: new Set(data?.order ?? []),
      status: data?.status ?? 'open',
      prizeLimit: data?.prizeLimit ?? 1,
      loaded: data !== null,
      fresh: fresh.size ? fresh : (EMPTY as Set<string>),
      stale,
    }),
    [data, stale, fresh]
  )
}

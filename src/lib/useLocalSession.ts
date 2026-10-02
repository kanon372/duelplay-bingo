'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { LOCAL_CHANGE_EVENT } from '@/lib/localStorage'
import type { MyCard } from '@/types'

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(LOCAL_CHANGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(LOCAL_CHANGE_EVENT, cb)
  }
}

function read(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

/** 端末に保存したマイカード・参加者番号（サーバー描画時は空）。保存が変わると自動で再描画される */
export function useLocalSession(): { cards: MyCard[]; participantNo: number | null; mounted: boolean } {
  const cardsRaw = useSyncExternalStore(subscribe, () => read('bingo_my_cards', '[]'), () => '[]')
  const noRaw = useSyncExternalStore(subscribe, () => read('bingo_participant_no', ''), () => '')
  const mounted = useSyncExternalStore(useCallback(() => () => {}, []), () => true, () => false)

  const cards = useMemo<MyCard[]>(() => {
    try { return JSON.parse(cardsRaw) } catch { return [] }
  }, [cardsRaw])
  const participantNo = noRaw ? Number(noRaw) : null
  return { cards, participantNo, mounted }
}

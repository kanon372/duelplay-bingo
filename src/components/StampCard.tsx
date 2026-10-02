'use client'

import { useState } from 'react'
import Image from 'next/image'

import type { StampStatus } from '@/lib/session'

interface StampCardProps {
  status: StampStatus | null
  onRefresh: () => Promise<void>
}

export default function StampCard({ status, onRefresh }: StampCardProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await onRefresh() } catch { /* ignore */ }
    setRefreshing(false)
  }

  if (!status) return null

  const count = [status.stamp_ad, status.stamp_nd, status.stamp_rental].filter(Boolean).length

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-gray-700">
      {/* スタンプカード画像 */}
      <div className="relative w-full" style={{ aspectRatio: '538/325' }}>
        <Image
          src="/stamp-card.png"
          alt="スタンプカード"
          fill
          className="object-contain"
        />
        {/* スタンプオーバーレイ — 各ボックスを絶対位置で配置 */}
        {([
          { key: 'stamp_ad'     as const, left: '10.2%',  top: '48.7%' },
          { key: 'stamp_nd'     as const, left: '40.7%', top: '48.7%' },
          { key: 'stamp_rental' as const, left: '70.9%', top: '48.7%' },
        ]).map(({ key, left, top }) => (
          <div
            key={key}
            className="absolute flex items-center justify-center"
            style={{ left, top, width: '19%', height: '36%' }}
          >
            {status[key] ? (
              <div className="w-full h-full rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.85)' }}>
                <span className="text-white font-black text-2xl drop-shadow">✓</span>
              </div>
            ) : (
              <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-400 opacity-30" />
            )}
          </div>
        ))}
      </div>

      {/* 更新ボタン */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="w-full py-1.5 bg-gray-700 text-gray-400 text-xs hover:bg-gray-600 flex items-center justify-center gap-1 disabled:opacity-50"
      >
        <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
        {refreshing ? '更新中...' : 'スタンプを更新'}
      </button>

      {/* 取得条件テキスト */}
      <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400 space-y-0.5">
        <p className={count >= 1 ? 'text-green-400' : ''}>✅ 1枚目：参加でもらえる</p>
        <p className={count >= 2 ? 'text-green-400' : 'text-gray-500'}>
          {count >= 2 ? '✅' : '○'} 2枚目：スタンプ2個で取得可能
        </p>
        <p className={count >= 3 ? 'text-green-400' : 'text-gray-500'}>
          {count >= 3 ? '✅' : '○'} 3枚目：スタンプ3個で取得可能
        </p>
      </div>
    </div>
  )
}

'use client'

import Image from 'next/image'
import { STAMP_CONFIG, STAMP_SYMBOLS } from '@/config/stamp'

interface BingoCellProps {
  cellValue: string
  isStamped: boolean
  isHighlighted: boolean
  accentColor?: string
  onClick: () => void
}

export default function BingoCell({ cellValue, isStamped, isHighlighted, accentColor = '#fbbf24', onClick }: BingoCellProps) {
  const isFree = cellValue === 'FREE'

  return (
    <div
      className={`relative aspect-[5/7] cursor-pointer select-none overflow-hidden transition-transform active:scale-95`}
      style={{
        background: 'rgba(255,255,255,0.88)',
        border: isHighlighted
          ? `2px solid ${accentColor}`
          : '1px solid rgba(255,255,255,0.6)',
        borderRadius: '3px',
        boxShadow: isHighlighted
          ? `0 0 8px ${accentColor}80, inset 0 0 4px ${accentColor}30`
          : '0 1px 3px rgba(0,0,0,0.3)',
      }}
      onClick={isFree ? undefined : onClick}
    >
      {isFree ? (
        /* FREEセル */
        <div className="flex h-full w-full flex-col items-center justify-center">
          <div
            className="text-xs font-black tracking-widest"
            style={{ color: accentColor, textShadow: `0 0 4px ${accentColor}80` }}
          >
            FREE
          </div>
        </div>
      ) : (
        /* カード画像 */
        <Image
          src={`/cards/${cellValue}.png`}
          alt={cellValue}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 18vw, 100px"
        />
      )}

      {/* スタンプオーバーレイ */}
      {(isStamped && !isFree) && (
        <div
          className={`absolute inset-0 flex items-center justify-center animate-stamp ${STAMP_CONFIG.color} ${STAMP_CONFIG.size}`}
          style={{
            opacity: STAMP_CONFIG.opacity,
            background: 'rgba(0,0,0,0.1)',
          }}
        >
          {STAMP_SYMBOLS[STAMP_CONFIG.type]}
        </div>
      )}

      {/* ハイライト時のキラキラ */}
      {isHighlighted && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${accentColor}20, transparent 70%)` }}
        />
      )}
    </div>
  )
}

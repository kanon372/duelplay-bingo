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

export default function BingoCell({
  cellValue,
  isStamped,
  isHighlighted,
  accentColor = '#fbbf24',
  onClick,
}: BingoCellProps) {
  const isFree = cellValue === 'FREE'

  return (
    <div
      className="relative w-full h-full cursor-pointer select-none overflow-hidden active:opacity-80 transition-opacity"
      style={{
        // 背景画像のセル枠に合わせて完全透明 (枠線は画像に含まれる)
        background: 'transparent',
        outline: isHighlighted ? `2px solid ${accentColor}` : 'none',
        outlineOffset: '-2px',
        borderRadius: '1px',
      }}
      onClick={isFree ? undefined : onClick}
    >
      {isFree ? (
        /* FREEセル: 背景テンプレートの FREE 表示に合わせて透明 */
        <div className="w-full h-full" />
      ) : (
        /* カード画像 */
        <Image
          src={`/cards/${cellValue}.png`}
          alt={cellValue}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 10vw, 80px"
        />
      )}

      {/* スタンプ */}
      {isStamped && !isFree && (
        <div
          className={`absolute inset-0 flex items-center justify-center animate-stamp ${STAMP_CONFIG.color} ${STAMP_CONFIG.size}`}
          style={{ opacity: STAMP_CONFIG.opacity }}
        >
          {STAMP_SYMBOLS[STAMP_CONFIG.type]}
        </div>
      )}

      {/* ビンゴラインのハイライト */}
      {isHighlighted && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `${accentColor}30` }}
        />
      )}
    </div>
  )
}

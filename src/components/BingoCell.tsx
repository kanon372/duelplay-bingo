'use client'

import Image from 'next/image'
import { STAMP_CONFIG, STAMP_SYMBOLS } from '@/config/stamp'

interface BingoCellProps {
  cellValue: string
  isStamped: boolean
  isHighlighted: boolean
  onClick: () => void
}

export default function BingoCell({ cellValue, isStamped, isHighlighted, onClick }: BingoCellProps) {
  const isFree = cellValue === 'FREE'

  return (
    <div
      className={`relative aspect-[5/7] cursor-pointer select-none overflow-hidden rounded border border-gray-600 transition-transform active:scale-95 ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
      onClick={isFree ? undefined : onClick}
    >
      {isFree ? (
        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white text-xs font-bold">FREE</div>
      ) : (
        <Image
          src={`/cards/${cellValue}.png`}
          alt={cellValue}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 18vw, 100px"
        />
      )}
      {(isStamped || isFree) && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/20 animate-stamp ${isFree ? 'text-white text-xl font-black' : `${STAMP_CONFIG.color} ${STAMP_CONFIG.size}`}`}
          style={{ opacity: isFree ? 1 : STAMP_CONFIG.opacity }}
        >
          {isFree ? 'FREE' : STAMP_SYMBOLS[STAMP_CONFIG.type]}
        </div>
      )}
    </div>
  )
}

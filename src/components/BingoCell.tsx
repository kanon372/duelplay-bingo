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
      className="relative w-full h-full cursor-pointer select-none active:opacity-80 transition-opacity"
      style={{
        background: 'transparent',
        outline: isHighlighted ? `2px solid ${accentColor}` : 'none',
        outlineOffset: '-2px',
        // overflow: visible にしてbleedを許可
        overflow: 'visible',
      }}
      onClick={isFree ? undefined : onClick}
    >
      {isFree ? (
        /* FREEセル: 背景テンプレートの FREE 表示に合わせて透明 */
        <div className="w-full h-full" />
      ) : (
        /*
         * カード画像 — 6px/210px=2.857% はみ出して黒枠を隠す
         * object-contain でカード全体を表示（切れを防ぐ）
         * inset: -2.857% で四辺をはみ出させる
         */
        <div
          style={{
            position: 'absolute',
            inset: '-2.857%',
            overflow: 'hidden',
          }}
        >
          <Image
            src={`/cards/${cellValue}.png`}
            alt={cellValue}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 10vw, 80px"
          />
        </div>
      )}

      {/* スタンプ (セル範囲のみ) */}
      {isStamped && !isFree && (
        <div
          className={`absolute inset-0 flex items-center justify-center animate-stamp ${STAMP_CONFIG.color} ${STAMP_CONFIG.size}`}
          style={{ opacity: STAMP_CONFIG.opacity, zIndex: 10 }}
        >
          {STAMP_SYMBOLS[STAMP_CONFIG.type]}
        </div>
      )}

      {/* ビンゴラインのハイライト */}
      {isHighlighted && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `${accentColor}30`, zIndex: 5 }}
        />
      )}
    </div>
  )
}

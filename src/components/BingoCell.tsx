'use client'

import Image from 'next/image'
import { STAMP_IMAGES, STAMP_FALLBACK, STAMP_FALLBACK_COLOR } from '@/config/stamp'

interface BingoCellProps {
  cellValue: string
  isStamped: boolean
  isHighlighted: boolean
  accentColor?: string
  colIndex: number   // 0〜4 (列番号)
  onClick: () => void
}

export default function BingoCell({
  cellValue,
  isStamped,
  isHighlighted,
  accentColor = '#fbbf24',
  colIndex,
  onClick,
}: BingoCellProps) {
  const isFree = cellValue === 'FREE'
  const stampImage = STAMP_IMAGES[colIndex]

  return (
    <div
      className="relative w-full h-full cursor-pointer select-none active:opacity-80 transition-opacity"
      style={{
        background: 'transparent',
        outline: isHighlighted ? `2px solid ${accentColor}` : 'none',
        outlineOffset: '-2px',
        overflow: 'visible',
      }}
      onClick={isFree ? undefined : onClick}
    >
      {isFree ? (
        /* FREEセル: 背景テンプレートの FREE 表示に合わせて透明 */
        <div className="w-full h-full" />
      ) : (
        /*
         * カード画像 — 4% はみ出して黒枠を隠す
         * object-contain でカード全体を表示（切れを防ぐ）
         */
        <div
          style={{
            position: 'absolute',
            inset: '-4%',
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

      {/* スタンプ */}
      {isStamped && !isFree && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 10 }}
        >
          {stampImage ? (
            <div style={{ position: 'absolute', inset: '0%' }}>
              <Image
                src={stampImage}
                alt="stamp"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 10vw, 80px"
              />
            </div>
          ) : (
            <span className={`text-4xl font-black ${STAMP_FALLBACK_COLOR}`} style={{ opacity: 0.9 }}>
              {STAMP_FALLBACK}
            </span>
          )}
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

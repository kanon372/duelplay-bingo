'use client'

import { useState, useEffect, useCallback } from 'react'
import BingoCell from './BingoCell'
import { checkBingo } from '@/lib/bingo'
import { getStamps, toggleStamp } from '@/lib/localStorage'
import type { BingoCard } from '@/types'

interface BingoGridProps {
  card: BingoCard
  accentColor?: string
}

export default function BingoGrid({ card, accentColor = '#fbbf24' }: BingoGridProps) {
  const [stamped, setStamped] = useState<Set<number>>(new Set())
  const [bingoLines, setBingoLines] = useState<number[][]>([])
  const [showBingo, setShowBingo] = useState(false)

  useEffect(() => {
    const saved = getStamps(card.id)
    setStamped(saved)
    setBingoLines(checkBingo(saved).lines)
  }, [card.id])

  const handleCellClick = useCallback((index: number) => {
    const newStamped = toggleStamp(card.id, index)
    setStamped(new Set(newStamped))
    const result = checkBingo(newStamped)
    const prevLineCount = bingoLines.length
    setBingoLines(result.lines)
    if (result.lines.length > prevLineCount) {
      setShowBingo(true)
      setTimeout(() => setShowBingo(false), 2500)
    }
  }, [card.id, bingoLines.length])

  const highlightedCells = new Set(bingoLines.flat())

  return (
    <div className="relative w-full h-full" style={{ overflow: 'visible' }}>
      {/* BINGO! フラッシュ */}
      {showBingo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className="text-4xl font-black animate-bounce drop-shadow-2xl"
            style={{
              color: '#ffd700',
              textShadow: '0 0 20px #ffd700, 0 2px 4px rgba(0,0,0,0.9)',
            }}
          >
            BINGO!
          </div>
        </div>
      )}

      {/*
       * 5×5 グリッド — 背景画像のセル枠に正確に重ねる
       *
       * 実測値 (元画像 3035×2150):
       *   行ギャップ (px): 47 / 47 / 44 / 37  ← 不均一なため grid-template で個別指定
       *   列ギャップ (px): 43 / 37 / 38 / 35  (左右平均)
       *   セル高さ: 300px / コンテナ高 1675px
       *   セル幅: 210(col0) + 211-213(col1-4) / コンテナ幅 1207px
       *
       * grid-template-rows % = px / 1675 (コンテナ高基準)
       * grid-template-columns % = px / 1207 (コンテナ幅基準)
       * gap行/列を挿入し、セルを奇数トラックに配置
       */}
      <div
        className="w-full h-full"
        style={{
          display: 'grid',
          // 9列: col0 gap col1 gap col2 gap col3 gap col4
          gridTemplateColumns: '17.398% 3.562% 17.481% 3.066% 17.481% 3.149% 17.481% 2.900% 17.481%',
          // 9行: row0 gap row1 gap row2 gap row3 gap row4
          gridTemplateRows: '17.910% 2.806% 17.910% 2.806% 17.910% 2.627% 17.910% 2.209% 17.910%',
        }}
      >
        {card.cells.map((cellValue, index) => {
          const r = Math.floor(index / 5)
          const c = index % 5
          return (
            <div
              key={index}
              style={{
                gridRow: 2 * r + 1,
                gridColumn: 2 * c + 1,
                position: 'relative',
              }}
            >
              <BingoCell
                cellValue={cellValue}
                isStamped={index === 12 || stamped.has(index)}
                isHighlighted={highlightedCells.has(index)}
                accentColor={accentColor}
                colIndex={c}
                onClick={() => handleCellClick(index)}
              />
            </div>
          )
        })}
      </div>

      {/* ビンゴライン数 */}
      {bingoLines.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center font-black text-sm py-0.5"
          style={{
            color: '#ffd700',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 20,
          }}
        >
          🎉 {bingoLines.length}ライン BINGO！
        </div>
      )}
    </div>
  )
}

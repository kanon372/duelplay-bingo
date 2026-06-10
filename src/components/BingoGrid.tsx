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

      {/* 5×5 グリッド (背景画像のセル枠にぴったり重ねる) */}
      {/* column-gap: 39.25/1207=3.252%, row-gap: 43.75/1207*(2150/3035)≈3.625% (CSS gap%はcontainer幅基準) */}
      <div className="grid grid-cols-5 w-full h-full" style={{ columnGap: '3.252%', rowGap: '3.625%', overflow: 'visible' }}>
        {card.cells.map((cellValue, index) => (
          <BingoCell
            key={index}
            cellValue={cellValue}
            isStamped={index === 12 || stamped.has(index)}
            isHighlighted={highlightedCells.has(index)}
            accentColor={accentColor}
            onClick={() => handleCellClick(index)}
          />
        ))}
      </div>

      {/* ビンゴライン数 */}
      {bingoLines.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center font-black text-sm py-0.5"
          style={{
            color: '#ffd700',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          🎉 {bingoLines.length}ライン BINGO！
        </div>
      )}
    </div>
  )
}

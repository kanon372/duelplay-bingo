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
    <div className="relative w-full">
      {/* BINGO！フラッシュ */}
      {showBingo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className="text-5xl font-black animate-bounce drop-shadow-2xl"
            style={{
              color: '#ffd700',
              textShadow: '0 0 20px #ffd700, 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            BINGO!
          </div>
        </div>
      )}

      {/* ヘッダー行（B I N G O） */}
      <div className="grid grid-cols-5 gap-0.5 mb-0.5">
        {['B','I','N','G','O'].map(letter => (
          <div
            key={letter}
            className="aspect-square flex items-center justify-center font-black text-base rounded-sm"
            style={{
              background: 'linear-gradient(135deg, #7c5200, #d4a017, #ffd700)',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,215,0,0.5)',
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* グリッド */}
      <div className="grid grid-cols-5 gap-0.5">
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
          className="mt-2 text-center font-bold text-base"
          style={{ color: '#ffd700', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          🎉 {bingoLines.length}ライン ビンゴ！
        </div>
      )}
    </div>
  )
}

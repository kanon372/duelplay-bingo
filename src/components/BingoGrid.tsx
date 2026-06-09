'use client'

import { useState, useEffect, useCallback } from 'react'
import BingoCell from './BingoCell'
import { checkBingo } from '@/lib/bingo'
import { getStamps, toggleStamp } from '@/lib/localStorage'
import type { BingoCard } from '@/types'

interface BingoGridProps {
  card: BingoCard
}

export default function BingoGrid({ card }: BingoGridProps) {
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
      {showBingo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-6xl font-black text-yellow-400 drop-shadow-lg animate-bounce">BINGO!</div>
        </div>
      )}
      <div className="grid grid-cols-5 gap-0.5">
        {card.cells.map((cellValue, index) => (
          <BingoCell
            key={index}
            cellValue={cellValue}
            isStamped={index === 12 || stamped.has(index)}
            isHighlighted={highlightedCells.has(index)}
            onClick={() => handleCellClick(index)}
          />
        ))}
      </div>
      {bingoLines.length > 0 && (
        <div className="mt-2 text-center text-yellow-400 font-bold text-lg">
          🎉 {bingoLines.length}ライン ビンゴ！
        </div>
      )}
    </div>
  )
}

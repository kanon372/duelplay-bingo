'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import BingoCell from './BingoCell'
import { completedLinesByDraws, reachLineCount } from '@/lib/bingo'
import { getStamps, toggleStamp } from '@/lib/localStorage'
import type { BingoCard } from '@/types'

interface BingoGridProps {
  card: BingoCard
  /** ゲームで出たカードの番号 */
  drawn: ReadonlySet<string>
  /** 直前の更新で新しく出たカード（光らせる演出用） */
  fresh?: ReadonlySet<string>
  accentColor?: string
}

const OPENED_EVENT = 'bingo-opened'

/** 端末に保存した「開けたマス」を読む（サーバー描画時は空。ビンゴ判定には使わない演出用の状態） */
function useOpenedCells(cardId: number): Set<number> {
  const key = `bingo_stamps_${cardId}`
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('storage', cb)
    window.addEventListener(OPENED_EVENT, cb)
    return () => {
      window.removeEventListener('storage', cb)
      window.removeEventListener(OPENED_EVENT, cb)
    }
  }, [])
  const raw = useSyncExternalStore(
    subscribe,
    () => { try { return localStorage.getItem(key) ?? '[]' } catch { return '[]' } },
    () => '[]'
  )
  return useMemo(() => {
    try { return new Set<number>(JSON.parse(raw)) } catch { return getStamps(cardId) }
  }, [raw, cardId])
}

export default function BingoGrid({ card, drawn, fresh, accentColor = '#fbbf24' }: BingoGridProps) {
  const opened = useOpenedCells(card.id)

  // 出たカードからそろったライン・リーチ（サーバーの申告判定と同じルール）
  const lines = useMemo(() => completedLinesByDraws(card.cells, drawn), [card.cells, drawn])
  const reach = useMemo(() => reachLineCount(card.cells, drawn), [card.cells, drawn])
  const highlighted = useMemo(() => new Set(lines.flat()), [lines])

  const handleCellClick = useCallback((index: number) => {
    toggleStamp(card.id, index)
    window.dispatchEvent(new Event(OPENED_EVENT))
  }, [card.id])

  return (
    <div className="relative w-full h-full" style={{ overflow: 'visible' }}>
      {/* BINGO! フラッシュ（ライン数が増えるたびに key で再生され、自然に消える） */}
      {lines.length > 0 && (
        <div key={lines.length} className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bingo-flash">
          <div
            className="text-4xl font-black drop-shadow-2xl"
            style={{ color: '#ffd700', textShadow: '0 0 20px #ffd700, 0 2px 4px rgba(0,0,0,0.9)' }}
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
                isStamped={opened.has(index)}
                isDrawn={drawn.has(cellValue)}
                isNewDraw={fresh?.has(cellValue) ?? false}
                isHighlighted={highlighted.has(index)}
                accentColor={accentColor}
                colIndex={c}
                onClick={() => handleCellClick(index)}
              />
            </div>
          )
        })}
      </div>

      {/* ライン数 / リーチ */}
      {(lines.length > 0 || reach > 0) && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center font-black text-sm py-0.5"
          style={{
            color: '#ffd700',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 20,
          }}
        >
          {lines.length > 0 ? `🎉 ${lines.length}ライン BINGO！` : `✨ リーチ ${reach}ライン`}
        </div>
      )}
    </div>
  )
}

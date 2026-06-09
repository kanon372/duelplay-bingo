'use client'

import { useEffect, useState } from 'react'
import { addMyCard, canAddCard, getMyCards } from '@/lib/localStorage'
import type { MyCard } from '@/types'

interface AddCardButtonProps {
  card: MyCard
}

export default function AddCardButton({ card }: AddCardButtonProps) {
  const [added, setAdded] = useState(false)
  const [full, setFull] = useState(false)

  useEffect(() => {
    const cards = getMyCards()
    setAdded(cards.some(c => c.id === card.id))
    setFull(!canAddCard() && !cards.some(c => c.id === card.id))
  }, [card.id])

  const handleAdd = () => {
    if (!canAddCard()) { setFull(true); return }
    addMyCard(card)
    setAdded(true)
  }

  if (added) return <div className="text-center text-green-400 text-sm py-2">✓ マイカードに追加済み</div>
  if (full) return <div className="text-center text-gray-400 text-sm py-2">マイカードは3枚まで保存できます</div>

  return (
    <button onClick={handleAdd} className="w-full py-2 rounded bg-white/10 text-white text-sm hover:bg-white/20 transition">
      ＋ マイカードに追加する
    </button>
  )
}

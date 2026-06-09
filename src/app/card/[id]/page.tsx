import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BingoGrid from '@/components/BingoGrid'
import AddCardButton from '@/components/AddCardButton'
import type { BingoCard } from '@/types'

const CIV_THEME: Record<string, { bg: string; text: string; border: string }> = {
  光:  { bg: 'bg-yellow-950',  text: 'text-yellow-300', border: 'border-yellow-500' },
  水:  { bg: 'bg-blue-950',    text: 'text-blue-300',   border: 'border-blue-500'   },
  火:  { bg: 'bg-red-950',     text: 'text-red-300',    border: 'border-red-500'    },
  自然: { bg: 'bg-green-950',  text: 'text-green-300',  border: 'border-green-500'  },
  闇:  { bg: 'bg-purple-950',  text: 'text-purple-300', border: 'border-purple-500' },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CardPage({ params }: PageProps) {
  const { id } = await params
  const cardId = parseInt(id, 10)
  if (isNaN(cardId)) notFound()

  const { data, error } = await supabase
    .from('bingo_cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (error || !data) notFound()

  const card = data as BingoCard
  const theme = CIV_THEME[card.civilization] ?? CIV_THEME['光']

  return (
    <main className={`min-h-screen ${theme.bg} p-3`}>
      <div className="max-w-lg mx-auto">
        <div className={`text-center mb-3 border-b ${theme.border} pb-2`}>
          <h1 className={`text-2xl font-black tracking-widest ${theme.text}`}>BINGO</h1>
          <p className={`text-sm ${theme.text} opacity-70`}>{card.civilization}文明 No.{card.id}</p>
        </div>
        <BingoGrid card={card} />
        <div className="mt-4 flex flex-col gap-2">
          <AddCardButton card={{ id: card.id, civilization: card.civilization }} />
          <a href="/" className="block text-center text-sm text-gray-400 underline">マイカード一覧へ</a>
        </div>
      </div>
    </main>
  )
}

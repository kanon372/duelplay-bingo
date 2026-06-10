import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BingoGrid from '@/components/BingoGrid'
import AddCardButton from '@/components/AddCardButton'
import type { BingoCard } from '@/types'

const CIV_THEME: Record<string, {
  gradient: string
  accent: string
  glow: string
  emoji: string
  pattern: string
}> = {
  光: {
    gradient: 'from-yellow-900 via-amber-700 to-yellow-500',
    accent: '#fbbf24',
    glow: 'shadow-yellow-400/60',
    emoji: '☀️',
    pattern: 'radial-gradient(circle at 30% 30%, rgba(251,191,36,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(245,158,11,0.2) 0%, transparent 50%)',
  },
  水: {
    gradient: 'from-blue-950 via-blue-800 to-cyan-600',
    accent: '#38bdf8',
    glow: 'shadow-blue-400/60',
    emoji: '💧',
    pattern: 'radial-gradient(ellipse at 20% 60%, rgba(56,189,248,0.3) 0%, transparent 60%), radial-gradient(circle at 90% 20%, rgba(14,165,233,0.2) 0%, transparent 50%)',
  },
  火: {
    gradient: 'from-red-950 via-red-800 to-orange-500',
    accent: '#f97316',
    glow: 'shadow-red-400/60',
    emoji: '🔥',
    pattern: 'radial-gradient(circle at 70% 40%, rgba(249,115,22,0.35) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(239,68,68,0.25) 0%, transparent 50%)',
  },
  自然: {
    gradient: 'from-green-950 via-green-800 to-emerald-500',
    accent: '#4ade80',
    glow: 'shadow-green-400/60',
    emoji: '🌿',
    pattern: 'radial-gradient(ellipse at 60% 70%, rgba(74,222,128,0.3) 0%, transparent 60%), radial-gradient(circle at 10% 20%, rgba(16,185,129,0.2) 0%, transparent 50%)',
  },
  闇: {
    gradient: 'from-gray-950 via-purple-950 to-violet-800',
    accent: '#a78bfa',
    glow: 'shadow-purple-400/60',
    emoji: '🌙',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.25) 0%, transparent 70%), radial-gradient(circle at 80% 20%, rgba(109,40,217,0.2) 0%, transparent 50%)',
  },
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
    <main
      className={`min-h-screen bg-gradient-to-br ${theme.gradient} relative overflow-hidden`}
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* 背景パターン */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.pattern }} />

      {/* 金色の枠線 */}
      <div className="absolute inset-2 pointer-events-none rounded-xl border-2 border-yellow-400/40" />
      <div className="absolute inset-3 pointer-events-none rounded-xl border border-yellow-300/20" />

      {/* コンテンツ */}
      <div className="relative z-10 flex flex-col min-h-screen p-3 pt-4">

        {/* BINGOバナー */}
        <div className="relative mb-4 mx-2">
          <div
            className="text-center py-2 px-4 rounded-lg shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #7c5200 0%, #d4a017 30%, #ffd700 50%, #d4a017 70%, #7c5200 100%)',
              boxShadow: `0 4px 20px ${theme.accent}80, inset 0 1px 0 rgba(255,255,255,0.3)`,
              border: '1px solid #ffd700',
            }}
          >
            <div className="text-3xl font-black tracking-[0.3em] text-white drop-shadow-lg" style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(255,215,0,0.5)',
            }}>
              BINGO
            </div>
          </div>
          {/* バナー両端の装飾 */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-yellow-400 text-xl">◆</div>
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-yellow-400 text-xl">◆</div>
        </div>

        {/* 文明バッジ */}
        <div className="flex justify-center mb-3">
          <div
            className="flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${theme.accent}80`,
              color: theme.accent,
            }}
          >
            <span>{theme.emoji}</span>
            <span>{card.civilization}文明</span>
            <span className="opacity-60 text-xs">No.{card.id}</span>
          </div>
        </div>

        {/* ビンゴグリッド */}
        <div
          className={`rounded-2xl p-2 shadow-2xl ${theme.glow} mx-1 flex-1`}
          style={{
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(4px)',
            border: `1px solid ${theme.accent}40`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${theme.accent}30`,
          }}
        >
          <BingoGrid card={card} accentColor={theme.accent} />
        </div>

        {/* ボタン */}
        <div className="mt-4 flex flex-col gap-2 mx-2 mb-4">
          <AddCardButton card={{ id: card.id, civilization: card.civilization }} />
          <a
            href="/"
            className="block text-center text-sm opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: theme.accent }}
          >
            ← マイカード一覧へ
          </a>
        </div>

      </div>
    </main>
  )
}

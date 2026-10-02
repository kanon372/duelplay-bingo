import { completedLinesByDraws } from '@/lib/bingo'

export interface GameState {
  status: 'open' | 'closed'
  prizeLimit: number
  onePrizePerParticipant: boolean
}

export const DEFAULT_GAME: GameState = { status: 'open', prizeLimit: 1, onePrizePerParticipant: true }

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface ClaimRow {
  id: number
  participant_id: number
  card_id: number
  lines: number
  seq: number
  status: ClaimStatus
  claimed_at: string
  decided_at: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supabase = any

export async function loadGame(supabase: Supabase): Promise<GameState> {
  const { data } = await supabase
    .from('game_state')
    .select('status, prize_limit, one_prize_per_participant')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return DEFAULT_GAME
  return {
    status: data.status === 'closed' ? 'closed' : 'open',
    prizeLimit: data.prize_limit,
    onePrizePerParticipant: data.one_prize_per_participant,
  }
}

/** 受付順位: 却下されていない申告の中での順番（1始まり）。却下が出ると後続が繰り上がる */
export function rankOf(claim: Pick<ClaimRow, 'id' | 'seq'>, all: Pick<ClaimRow, 'seq' | 'status'>[]): number {
  return all.filter(c => c.status !== 'rejected' && c.seq <= claim.seq).length
}

/** 申告がいまの「出たカード」でも成立しているか（運営が出たカードの入力を取り消した場合の検出用） */
export function isClaimValidNow(cells: readonly string[], drawn: ReadonlySet<string>): boolean {
  return completedLinesByDraws(cells, drawn).length > 0
}

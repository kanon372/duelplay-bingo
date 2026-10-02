// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { POST } from './route'

const cells = Array.from({ length: 25 }, (_, i) => (i === 12 ? 'FREE' : `c${i}`))
const claim = { id: 1, participant_id: 5, card_id: 10, lines: 1, seq: 1, status: 'pending' }
const rowDrawn = (...ids: number[]) => ids.map(i => ({ card_no: `c${i}` }))
const call = (body: unknown, password = 'secret') => POST(new NextRequest('http://localhost/api/admin/claims', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '6.6.6.6', 'x-admin-password': password },
  body: JSON.stringify(body),
}))

function setup(opts: { drawn: { card_no: string }[]; approved: number; prizeLimit: number }) {
  fake = makeFakeSupabase({
    tables: {
      bingo_claims: { data: claim, count: opts.approved },
      bingo_cards: { data: { cells } },
      draws: { data: opts.drawn },
      game_state: { data: { status: 'open', prize_limit: opts.prizeLimit, one_prize_per_participant: true } },
    },
  })
}

beforeEach(() => { process.env.ADMIN_PASSWORD = 'secret'; fake = makeFakeSupabase({}) })

describe('POST /api/admin/claims', () => {
  it('認証が無ければ 401', async () => {
    setup({ drawn: rowDrawn(0, 1, 2, 3, 4), approved: 0, prizeLimit: 1 })
    expect((await call({ claimId: 1, decision: 'approve' }, 'wrong')).status).toBe(401)
    expect(fake.calls.some(c => c.op === 'update')).toBe(false)
  })

  it('パラメータが不正なら 400', async () => {
    expect((await call({ claimId: 'x', decision: 'approve' })).status).toBe(400)
    expect((await call({ claimId: 1, decision: 'delete' })).status).toBe(400)
  })

  it('いまもビンゴが成立していれば承認できる', async () => {
    setup({ drawn: rowDrawn(0, 1, 2, 3, 4), approved: 0, prizeLimit: 1 })
    const res = await call({ claimId: 1, decision: 'approve' })
    expect(await res.json()).toMatchObject({ success: true, status: 'approved' })
    expect(fake.calls.some(c => c.table === 'bingo_claims' && c.op === 'update')).toBe(true)
  })

  it('出たカードの入力が取り消されて不成立なら承認できない（409）', async () => {
    setup({ drawn: rowDrawn(0, 1, 2, 3), approved: 0, prizeLimit: 1 })
    const res = await call({ claimId: 1, decision: 'approve' })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('invalid_now')
    expect(fake.calls.some(c => c.op === 'update')).toBe(false)
  })

  it('景品の人数に達していたら承認できない（409）', async () => {
    setup({ drawn: rowDrawn(0, 1, 2, 3, 4), approved: 3, prizeLimit: 3 })
    const res = await call({ claimId: 1, decision: 'approve' })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('limit_reached')
  })

  it('却下は成立状況や人数に関係なくできる', async () => {
    setup({ drawn: [], approved: 99, prizeLimit: 1 })
    expect((await (await call({ claimId: 1, decision: 'reject' })).json()).status).toBe('rejected')
  })

  it('存在しない申告は 404', async () => {
    fake = makeFakeSupabase({ tables: { bingo_claims: { data: null } } })
    expect((await call({ claimId: 99, decision: 'reject' })).status).toBe(404)
  })
})

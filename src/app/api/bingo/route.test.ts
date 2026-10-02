// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { POST } from './route'

const TOKEN = '11111111-2222-3333-4444-555555555555'
const call = (body: unknown) => POST(new NextRequest('http://localhost/api/bingo', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}))

beforeEach(() => { fake = makeFakeSupabase({}) })

describe('POST /api/bingo', () => {
  it('トークンやカード番号が不正なら 400（DBに触らない）', async () => {
    expect((await call({})).status).toBe(400)
    expect((await call({ token: 'x', cardId: 1 })).status).toBe(400)
    expect((await call({ token: TOKEN, cardId: '1; drop table' })).status).toBe(400)
    expect(fake.calls).toHaveLength(0)
  })

  it('存在しないトークンは 401', async () => {
    fake = makeFakeSupabase({ tables: { participants: { data: null } } })
    expect((await call({ token: TOKEN, cardId: 1 })).status).toBe(401)
  })

  it('受け付けたら順位を返す（却下された申告は順位に数えない）', async () => {
    fake = makeFakeSupabase({
      tables: {
        participants: { data: { id: 5 } },
        bingo_claims: { data: [
          { id: 1, seq: 1, status: 'rejected' },
          { id: 2, seq: 2, status: 'pending' },
          { id: 3, seq: 3, status: 'pending' },
        ] },
      },
      rpc: { claim_bingo: { data: { status: 'ok', claimId: 3, cardId: 10, lines: 1, seq: 3 } } },
    })
    const res = await call({ token: TOKEN, cardId: 10 })
    const body = await res.json()
    expect(body).toMatchObject({ status: 'ok', rank: 2, claimStatus: 'pending', lines: 1 })
    expect(fake.calls.find(c => c.op === 'rpc:claim_bingo')?.args).toEqual({ p_participant: 5, p_card: 10 })
  })

  it('成立していない・終了・他人のカードは DB関数の判定をそのまま返す', async () => {
    for (const status of ['not_bingo', 'closed', 'not_owner']) {
      fake = makeFakeSupabase({
        tables: { participants: { data: { id: 5 } } },
        rpc: { claim_bingo: { data: { status } } },
      })
      const body = await (await call({ token: TOKEN, cardId: 10 })).json()
      expect(body.status).toBe(status)
      expect(body.rank).toBeUndefined()
    }
  })

  it('DB関数がエラーなら 500', async () => {
    fake = makeFakeSupabase({
      tables: { participants: { data: { id: 5 } } },
      rpc: { claim_bingo: { data: null, error: { message: 'boom' } } },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await call({ token: TOKEN, cardId: 10 })).status).toBe(500)
  })
})

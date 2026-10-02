// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { POST } from './route'

const TOKEN = '11111111-2222-3333-4444-555555555555'
const call = (body: unknown) => POST(new NextRequest('http://localhost/api/me', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}))

beforeEach(() => { fake = makeFakeSupabase({}) })

describe('POST /api/me', () => {
  it('トークンが無い・形式不正なら 401', async () => {
    expect((await call({})).status).toBe(401)
    expect((await call({ token: 'abc' })).status).toBe(401)
    expect(fake.calls).toHaveLength(0)
  })

  it('存在しないトークン（リセット後の古い端末）は 401', async () => {
    fake = makeFakeSupabase({ tables: { participants: { data: null } } })
    const res = await call({ token: TOKEN })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('invalid_token')
  })

  it('参加者番号・カード・スタンプを返す（スタンプ未登録は全て false）', async () => {
    fake = makeFakeSupabase({
      tables: {
        participants: { data: { id: 5 } },
        bingo_cards: { data: [{ id: 10, civilization: '光' }] },
        participant_stamps: { data: null },
      },
    })
    const res = await call({ token: TOKEN })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      participantNo: 5,
      cards: [{ id: 10, civilization: '光' }],
      stamps: { stamp_ad: false, stamp_nd: false, stamp_rental: false },
    })
    expect(res.headers.get('cache-control')).toContain('no-store')
  })
})

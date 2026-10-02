// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { POST } from './route'

const TOKEN = '11111111-2222-3333-4444-555555555555'

function call(body: unknown) {
  return POST(new NextRequest('http://localhost/api/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

beforeEach(() => {
  process.env.EVENT_CODE = 'evt-2026'
  fake = makeFakeSupabase({})
})

describe('POST /api/claim', () => {
  it('イベントコードが違えば 403（DBには触れない）', async () => {
    const res = await call({ code: 'old-event', civilization: '光' })
    expect(res.status).toBe(403)
    expect((await res.json()).status).toBe('invalid_code')
    expect(fake.calls).toHaveLength(0)
  })

  it('イベントコード無しも 403', async () => {
    expect((await call({ civilization: '光' })).status).toBe(403)
  })

  it('不正な文明名は 400', async () => {
    const res = await call({ code: 'evt-2026', civilization: '風' })
    expect(res.status).toBe(400)
  })

  it('トークン無しなら参加者を新規作成してカードを割り当てる', async () => {
    fake = makeFakeSupabase({
      tables: { participants: { data: { id: 7, token: TOKEN } } },
      rpc: { claim_bingo_card: { data: { status: 'ok', card: { id: 42, civilization: '光' } } } },
    })
    const res = await call({ code: 'evt-2026', civilization: '光' })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ status: 'ok', card: { id: 42 }, participantNo: 7, token: TOKEN })
    expect(fake.calls.some(c => c.table === 'participants' && c.op === 'insert')).toBe(true)
    expect(fake.calls.find(c => c.op === 'rpc:claim_bingo_card')?.args).toEqual({ p_civ: '光', p_participant: 7 })
  })

  it('有効なトークンなら既存の参加者を使い、新規作成しない', async () => {
    fake = makeFakeSupabase({
      tables: { participants: { data: { id: 3, token: TOKEN } } },
      rpc: { claim_bingo_card: { data: { status: 'stamp_required', required: 2, current: 1 } } },
    })
    const res = await call({ code: 'evt-2026', civilization: '水', token: TOKEN })
    const body = await res.json()
    expect(body).toMatchObject({ status: 'stamp_required', required: 2, current: 1, participantNo: 3 })
    expect(fake.calls.some(c => c.op === 'insert')).toBe(false)
  })

  it('トークンの形式が不正なら無視して新規参加者として扱う（DBに不正値を渡さない）', async () => {
    fake = makeFakeSupabase({
      tables: { participants: { data: { id: 9, token: TOKEN } } },
      rpc: { claim_bingo_card: { data: { status: 'ok', card: { id: 1, civilization: '光' } } } },
    })
    const res = await call({ code: 'evt-2026', civilization: '光', token: "x' or 1=1" })
    expect((await res.json()).participantNo).toBe(9)
    expect(fake.calls.some(c => c.op === 'insert')).toBe(true)
  })

  it('枚数超過・売り切れはDB関数の判定をそのまま返す', async () => {
    for (const status of ['full', 'sold_out']) {
      fake = makeFakeSupabase({
        tables: { participants: { data: { id: 3, token: TOKEN } } },
        rpc: { claim_bingo_card: { data: { status } } },
      })
      expect((await (await call({ code: 'evt-2026', civilization: '光', token: TOKEN })).json()).status).toBe(status)
    }
  })

  it('DB関数がエラーなら 500', async () => {
    fake = makeFakeSupabase({
      tables: { participants: { data: { id: 3, token: TOKEN } } },
      rpc: { claim_bingo_card: { data: null, error: { message: 'boom' } } },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await call({ code: 'evt-2026', civilization: '光', token: TOKEN })).status).toBe(500)
  })
})

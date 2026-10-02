// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { POST } from './route'

const call = (body: unknown, password = 'secret') => POST(new NextRequest('http://localhost/api/admin/draws', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '7.7.7.7', 'x-admin-password': password },
  body: JSON.stringify(body),
}))

beforeEach(() => { process.env.ADMIN_PASSWORD = 'secret'; fake = makeFakeSupabase({}) })

describe('POST /api/admin/draws', () => {
  it('認証が無ければ 401', async () => {
    expect((await call({ cardNo: '1900000' }, 'wrong')).status).toBe(401)
    expect(fake.calls).toHaveLength(0)
  })
  it('追加は upsert（同じカードを連打しても1件）', async () => {
    const res = await call({ cardNo: '1900000' })
    expect(res.status).toBe(200)
    expect(fake.calls[0]).toMatchObject({ table: 'draws', op: 'upsert' })
    expect((fake.calls[0].args as unknown[])[1]).toMatchObject({ onConflict: 'card_no', ignoreDuplicates: true })
  })
  it('remove は削除', async () => {
    await call({ cardNo: '1900000', action: 'remove' })
    expect(fake.calls[0]).toMatchObject({ table: 'draws', op: 'delete' })
  })
  it('FREE・記号入り・空・不正な action は 400', async () => {
    for (const body of [{ cardNo: 'FREE' }, { cardNo: "1; drop" }, { cardNo: '' }, {}, { cardNo: '1900000', action: 'x' }]) {
      expect((await call(body)).status).toBe(400)
    }
    expect(fake.calls).toHaveLength(0)
  })
})

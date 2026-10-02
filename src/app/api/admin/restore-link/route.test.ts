// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { GET } from './route'

const TOKEN = '11111111-2222-3333-4444-555555555555'
const call = (no: string, password?: string) => GET(new NextRequest(
  `http://localhost/api/admin/restore-link?participantNo=${no}`,
  { headers: { 'x-forwarded-for': '5.5.5.5', ...(password ? { 'x-admin-password': password } : {}) } },
))

beforeEach(() => { process.env.ADMIN_PASSWORD = 'secret'; fake = makeFakeSupabase({}) })

describe('GET /api/admin/restore-link', () => {
  it('管理者認証なしでは秘密トークン入りURLを返さない', async () => {
    fake = makeFakeSupabase({ tables: { participants: { data: { id: 1, token: TOKEN } } } })
    const res = await call('1')
    expect(res.status).toBe(401)
    expect(await res.text()).not.toContain(TOKEN)
  })
  it('認証済みなら復元用パスを返す', async () => {
    fake = makeFakeSupabase({ tables: { participants: { data: { id: 1, token: TOKEN } } } })
    const res = await call('1', 'secret')
    expect(await res.json()).toEqual({ participantNo: 1, path: `/restore/${TOKEN}` })
  })
  it('存在しない番号は 404、不正な番号は 400', async () => {
    fake = makeFakeSupabase({ tables: { participants: { data: null } } })
    expect((await call('99', 'secret')).status).toBe(404)
    expect((await call('abc', 'secret')).status).toBe(400)
  })
})

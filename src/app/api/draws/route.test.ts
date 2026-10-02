// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { makeFakeSupabase } from '@/test/fake-supabase'

let fake: ReturnType<typeof makeFakeSupabase>
vi.mock('@/lib/supabase-server', () => ({ getServiceClient: () => fake.client }))

import { GET } from './route'

describe('GET /api/draws', () => {
  it('出たカードと状態を返し、CDNで数秒キャッシュさせる', async () => {
    fake = makeFakeSupabase({
      tables: {
        draws: { data: [{ card_no: '1900000' }, { card_no: '1938000' }] },
        game_state: { data: { status: 'closed', prize_limit: 3, one_prize_per_participant: true } },
      },
    })
    const res = await GET()
    expect(await res.json()).toEqual({ drawn: ['1900000', '1938000'], status: 'closed', prizeLimit: 3 })
    expect(res.headers.get('cache-control')).toContain('s-maxage=2')
  })

  it('ゲーム設定が無くても受付中・1人として返す', async () => {
    fake = makeFakeSupabase({ tables: { draws: { data: [] } } })
    expect(await (await GET()).json()).toEqual({ drawn: [], status: 'open', prizeLimit: 1 })
  })

  it('DBエラーはキャッシュさせずに 500', async () => {
    fake = makeFakeSupabase({ tables: { draws: { data: null, error: { message: 'x' } } } })
    const res = await GET()
    expect(res.status).toBe(500)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

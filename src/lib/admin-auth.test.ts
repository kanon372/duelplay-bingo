// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { checkAdminAuth, safeEqual } from './admin-auth'

function req(password: string | null, ip: string) {
  const headers: Record<string, string> = { 'x-forwarded-for': ip }
  if (password !== null) headers['x-admin-password'] = password
  return new NextRequest('http://localhost/api/admin/cards', { headers })
}

describe('safeEqual', () => {
  it('同じ文字列は true、違う文字列・長さ違いは false', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('checkAdminAuth', () => {
  const original = process.env.ADMIN_PASSWORD
  beforeEach(() => { process.env.ADMIN_PASSWORD = 'secret' })
  afterEach(() => { process.env.ADMIN_PASSWORD = original })

  it('正しいパスワードは ok', () => {
    expect(checkAdminAuth(req('secret', '1.1.1.1'))).toBe('ok')
  })
  it('間違い・未指定は unauthorized', () => {
    expect(checkAdminAuth(req('wrong', '1.1.1.2'))).toBe('unauthorized')
    expect(checkAdminAuth(req(null, '1.1.1.2'))).toBe('unauthorized')
  })
  it('ADMIN_PASSWORD 未設定なら誰も通さない（空文字同士で一致させない）', () => {
    delete process.env.ADMIN_PASSWORD
    expect(checkAdminAuth(req('', '1.1.1.3'))).toBe('unauthorized')
  })
  it('同一IPで失敗が続くとロックされ、正しいパスワードでも弾く', () => {
    for (let i = 0; i < 10; i++) expect(checkAdminAuth(req('wrong', '9.9.9.9'))).toBe('unauthorized')
    expect(checkAdminAuth(req('wrong', '9.9.9.9'))).toBe('locked')
    expect(checkAdminAuth(req('secret', '9.9.9.9'))).toBe('locked')
    // 他のIPには影響しない
    expect(checkAdminAuth(req('secret', '8.8.8.8'))).toBe('ok')
  })
  it('成功すると失敗回数がリセットされる', () => {
    for (let i = 0; i < 9; i++) checkAdminAuth(req('wrong', '7.7.7.7'))
    expect(checkAdminAuth(req('secret', '7.7.7.7'))).toBe('ok')
    for (let i = 0; i < 9; i++) expect(checkAdminAuth(req('wrong', '7.7.7.7'))).toBe('unauthorized')
  })
})

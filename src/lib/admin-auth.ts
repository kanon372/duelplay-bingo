import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

const MAX_FAILURES = 10
const WINDOW_MS = 10 * 60 * 1000
const failures = new Map<string, { count: number; resetAt: number }>()

function clientKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export type AdminAuthResult = 'ok' | 'unauthorized' | 'locked'

/**
 * 管理APIの認証。パスワードは定数時間で比較し、
 * 同一IPからの失敗が続いたら一定時間ロックする（サーバーレスなのでインスタンス単位の簡易制限）。
 */
export function checkAdminAuth(request: NextRequest): AdminAuthResult {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return 'unauthorized'

  const key = clientKey(request)
  const now = Date.now()
  const entry = failures.get(key)
  if (entry && entry.resetAt > now && entry.count >= MAX_FAILURES) return 'locked'

  const given = request.headers.get('x-admin-password') ?? ''
  if (safeEqual(given, expected)) {
    failures.delete(key)
    return 'ok'
  }

  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
  return 'unauthorized'
}

export function adminDeniedResponse(result: Exclude<AdminAuthResult, 'ok'>): Response {
  if (result === 'locked') {
    return Response.json({ error: '試行回数が多すぎます。しばらくしてからやり直してください' }, { status: 429 })
  }
  return Response.json({ error: '認証失敗' }, { status: 401 })
}

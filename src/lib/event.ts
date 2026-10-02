import { safeEqual } from '@/lib/admin-auth'

/**
 * イベントコード（QRのURLに含まれる）の検証。
 * サーバー専用の EVENT_CODE を優先し、無ければ従来の NEXT_PUBLIC_EVENT_CODE を使う。
 */
export function isValidEventCode(code: unknown): boolean {
  const expected = process.env.EVENT_CODE ?? process.env.NEXT_PUBLIC_EVENT_CODE
  if (!expected || typeof code !== 'string') return false
  return safeEqual(code, expected)
}

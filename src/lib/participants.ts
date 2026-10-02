const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export const CIVILIZATIONS = ['光', '水', '火', '自然', '闇'] as const

export interface MyCardRow { id: number; civilization: string }
export interface StampRow { stamp_ad: boolean; stamp_nd: boolean; stamp_rental: boolean }

export const NO_STAMPS: StampRow = { stamp_ad: false, stamp_nd: false, stamp_rental: false }

export type StampType = 'check' | 'circle' | 'cross'

export interface StampConfig {
  type: StampType
  color: string
  size: string
  opacity: number
}

export const STAMP_CONFIG: StampConfig = {
  type: 'check',
  color: 'text-green-500',
  size: 'text-4xl',
  opacity: 0.9,
}

export const STAMP_SYMBOLS: Record<StampType, string> = {
  check: '✓',
  circle: '○',
  cross: '×',
}

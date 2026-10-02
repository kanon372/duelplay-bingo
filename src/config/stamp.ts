/**
 * スタンプ設定
 *
 * 縦列（0〜4）ごとに異なる画像を使用します。
 * 画像ファイルは public/stamps/ に置いてください。
 *
 * 例:
 *   col0: /stamps/stamp0.png  (1列目 = Bの列)
 *   col1: /stamps/stamp1.png  (2列目 = Iの列)
 *   col2: /stamps/stamp2.png  (3列目 = Nの列・FREEセルの列)
 *   col3: /stamps/stamp3.png  (4列目 = Gの列)
 *   col4: /stamps/stamp4.png  (5列目 = Oの列)
 *
 * ファイルが存在しない列はデフォルトの ✓ マークが表示されます。
 */

export const STAMP_IMAGES: Record<number, string> = {
  0: '/stamps/stamp0.png',
  1: '/stamps/stamp1.png',
  2: '/stamps/stamp2.png',
  3: '/stamps/stamp3.png',
  4: '/stamps/stamp4.png',
}

// 画像ファイルが未配置のときに使うフォールバック
export const STAMP_FALLBACK = '✓'
export const STAMP_FALLBACK_COLOR = 'text-green-500'

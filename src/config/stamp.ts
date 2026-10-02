/**
 * スタンプ設定
 *
 * 縦列（0〜4）ごとに異なる画像を使用します。
 * 配信用の軽量画像は public/stamps/（assets-src/stamps の元画像から npm run make-thumbs で生成）。
 *
 * 例:
 *   col0: /stamps/stamp0.webp  (1列目 = Bの列)
 *   col1: /stamps/stamp1.webp  (2列目 = Iの列)
 *   col2: /stamps/stamp2.webp  (3列目 = Nの列・FREEセルの列)
 *   col3: /stamps/stamp3.webp  (4列目 = Gの列)
 *   col4: /stamps/stamp4.webp  (5列目 = Oの列)
 *
 * ファイルが存在しない列はデフォルトの ✓ マークが表示されます。
 */

export const STAMP_IMAGES: Record<number, string> = {
  0: '/stamps/stamp0.webp',
  1: '/stamps/stamp1.webp',
  2: '/stamps/stamp2.webp',
  3: '/stamps/stamp3.webp',
  4: '/stamps/stamp4.webp',
}

// 画像ファイルが未配置のときに使うフォールバック
export const STAMP_FALLBACK = '✓'
export const STAMP_FALLBACK_COLOR = 'text-green-500'

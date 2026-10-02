/**
 * 配信用の軽量画像を生成する。
 *   assets-src/cards/<id>.png    → public/cards/<id>.webp    (幅 256px)
 *   assets-src/stamps/stampN.png → public/stamps/stampN.webp (幅 192px・透過)
 *
 * 元画像（1枚 約2.4MB）をそのまま配信すると、カード1枚の表示で約58MBを読み込むことになり、
 * 会場の回線でもお客さんの端末でも表示が止まるため、必ずこのスクリプトで変換した画像を配信する。
 *
 * 使い方: npm run make-thumbs   （カード画像を追加・差し替えたあとに実行）
 */
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

const ROOT = path.resolve(__dirname, '..')

async function convert(srcDir: string, destDir: string, width: number, quality: number) {
  fs.mkdirSync(destDir, { recursive: true })
  const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.png'))
  let before = 0
  let after = 0
  for (const file of files) {
    const src = path.join(srcDir, file)
    const dest = path.join(destDir, file.replace(/\.png$/i, '.webp'))
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality, alphaQuality: 90 }).toFile(dest)
    before += fs.statSync(src).size
    after += fs.statSync(dest).size
  }
  const mb = (n: number) => (n / 1024 / 1024).toFixed(1)
  console.log(`${path.relative(ROOT, srcDir)}: ${files.length} files  ${mb(before)}MB -> ${mb(after)}MB`)
}

async function main() {
  await convert(path.join(ROOT, 'assets-src/cards'), path.join(ROOT, 'public/cards'), 256, 80)
  await convert(path.join(ROOT, 'assets-src/stamps'), path.join(ROOT, 'public/stamps'), 192, 85)
}

main().catch(err => { console.error(err); process.exit(1) })

import * as fs from 'fs'
import * as path from 'path'

const SOURCE_DIR = path.resolve(__dirname, '../../sddownload/36弾/36弾')
const DEST_DIR = path.resolve(__dirname, '../public/cards')

function copyImages(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      copyImages(fullPath)
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      const destPath = path.join(DEST_DIR, entry.name)
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(fullPath, destPath)
        console.log(`Copied: ${entry.name}`)
      }
    }
  }
}

fs.mkdirSync(DEST_DIR, { recursive: true })
copyImages(SOURCE_DIR)
console.log('Done! Card images copied to public/cards/')

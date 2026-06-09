import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  const json = fs.readFileSync(
    path.resolve(__dirname, '../../sddownload/bingo_cards.json'),
    'utf-8'
  )
  const cards = JSON.parse(json)

  console.log(`Seeding ${cards.length} cards...`)

  // 100件ずつバッチ挿入
  for (let i = 0; i < cards.length; i += 100) {
    const batch = cards.slice(i, i + 100)
    const { error } = await supabase
      .from('bingo_cards')
      .upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error('Error:', error)
      process.exit(1)
    }
    console.log(`Inserted ${Math.min(i + 100, cards.length)} / ${cards.length}`)
  }

  console.log('Seed complete!')
}

seed()

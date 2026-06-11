import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migrate-secret')
  if (secret !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: '認証失敗' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const sql = `
    CREATE TABLE IF NOT EXISTS participant_stamps (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES participants(id) UNIQUE NOT NULL,
      stamp_ad BOOLEAN DEFAULT FALSE,
      stamp_nd BOOLEAN DEFAULT FALSE,
      stamp_rental BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE participant_stamps DISABLE ROW LEVEL SECURITY;
  `

  const res = await fetch(`${supabaseUrl}/pg-meta/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  if (!res.ok) {
    return NextResponse.json({ error: text, status: res.status }, { status: 500 })
  }

  return NextResponse.json({ success: true, result: text })
}

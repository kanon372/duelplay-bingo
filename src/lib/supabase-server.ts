import { createClient } from '@supabase/supabase-js'

// モジュールレベルのシングルトン: リクエスト毎に新規生成せず接続を再利用
let _service: ReturnType<typeof createClient> | null = null
let _anon: ReturnType<typeof createClient> | null = null

export function getServiceClient() {
  if (!_service) {
    _service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _service
}

export function getAnonClient() {
  if (!_anon) {
    _anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _anon
}

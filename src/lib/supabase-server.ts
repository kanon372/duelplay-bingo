import { createClient } from '@supabase/supabase-js'

// モジュールレベルのシングルトン: リクエスト毎に新規生成せず接続を再利用
let _service: ReturnType<typeof createClient> | null = null

/**
 * service role クライアント（サーバー側APIルート専用）。
 * テーブルはRLS有効・公開ロールの権限なしなので、DBへのアクセスは全てここを通す。
 * 型生成をしていないため any 扱いで返す。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceClient(): any {
  if (!_service) {
    _service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _service
}

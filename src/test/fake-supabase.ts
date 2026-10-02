/**
 * APIルートのテスト用の最小限の Supabase クライアントのモック。
 * `.from(table).select().eq().maybeSingle()` などのチェーンを、テーブル名ごとに用意した結果で返す。
 */
export interface FakeResult { data: unknown; error?: unknown }

export function makeFakeSupabase(opts: {
  tables?: Record<string, FakeResult | ((op: string) => FakeResult)>
  rpc?: Record<string, FakeResult>
}) {
  const calls: { table?: string; op: string; args?: unknown }[] = []

  const chain = (table: string, op: string): unknown => {
    const result = () => {
      const t = opts.tables?.[table]
      const r = typeof t === 'function' ? t(op) : t
      return r ?? { data: null, error: null }
    }
    const handler: ProxyHandler<object> = {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) => resolve({ error: null, ...result() })
        }
        if (prop === 'maybeSingle' || prop === 'single') {
          return () => Promise.resolve({ error: null, ...result() })
        }
        return (...args: unknown[]) => {
          if (['insert', 'update', 'delete', 'upsert'].includes(String(prop))) {
            calls.push({ table, op: String(prop), args })
            return chain(table, String(prop))
          }
          return new Proxy({}, handler)
        }
      },
    }
    return new Proxy({}, handler)
  }

  return {
    calls,
    client: {
      from: (table: string) => chain(table, 'select'),
      rpc: (name: string, args: unknown) => {
        calls.push({ op: `rpc:${name}`, args })
        return Promise.resolve({ error: null, ...(opts.rpc?.[name] ?? { data: null }) })
      },
    },
  }
}

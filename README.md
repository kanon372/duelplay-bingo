# デュエプレ ビンゴ大会アプリ

イベント会場でお客さんにビンゴカードを配り、スタンプ（サイドイベント）で進行を管理する Next.js + Supabase のアプリ。

- お客さんは文明ごとのQR（`/join/<イベントコード>/<文明>`）を読み取ってカードを受け取る（1人3枚まで）
- 2枚目はスタンプ2個、3枚目はスタンプ3個が必要（スタッフが管理画面 `/admin` で付与）
- 参加者の本人確認は端末に保存した秘密トークンで行う。カードの所有・枚数・スタンプ条件は全てサーバー側（DB関数 `claim_bingo_card`）で検証する

> このリポジトリの Next.js は一般的なものと仕様が異なる部分がある（`AGENTS.md` 参照）。実装前に `node_modules/next/dist/docs/` を読むこと。

## セットアップ

```bash
npm ci
cp .env.example .env.local   # 値を設定
npm run dev
```

### 環境変数

| 名前 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのURL |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側APIがDBに触るためのキー（**公開しない**） |
| `ADMIN_PASSWORD` | 管理画面のパスワード |
| `EVENT_CODE` | QRに含まれるイベントコード。変えると古いQRは使えなくなる（旧名 `NEXT_PUBLIC_EVENT_CODE` でも可） |
| `SITE_URL` | QR生成用のサイトURL（`npm run generate-qr`） |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` は不要になった（DBは公開ロールから一切アクセスできない）。

### データベース

- 新規プロジェクト: `supabase/schema.sql` を実行
- 既存プロジェクト: `supabase/migrations/` の未適用の差分を順に実行
- カードデータ（`bingo_cards`）の投入は `npm run seed-db`

### 画像

`public/` には軽量化したWebPだけを置き、元画像は `assets-src/` にある。カード画像を追加・差し替えたら `npm run make-thumbs` を実行する（元画像のまま配信すると1枚のカード表示で約58MBの通信になる）。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` / `build` / `start` | 開発・ビルド・本番起動 |
| `npm run typecheck` / `lint` / `test:run` | 型チェック・ESLint・テスト |
| `npm run make-thumbs` | 配信用画像を生成 |
| `npm run generate-qr` | 文明ごとのQRを `out/qr-codes.html` に生成 |

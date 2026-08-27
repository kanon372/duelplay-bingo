<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIコラボレーション方針

## 役割分担

- Claude Codeは、実装方針の提案、設計上の論点整理、およびCodexが作成した変更のコードレビューを担当する。
- Codexは、コード編集、テスト、修正、コミット、push、およびPull Request作成を担当する。
- Claude Codeは、ユーザーから明示的に依頼された場合を除き、コードを直接変更しない。
- Codexは、Claude Codeの提案やレビューを入力として扱うが、実コード、ログ、Network、テスト結果で確認し、提案内容を無条件に適用しない。

## GitHub上の引き継ぎ

- Claude CodeからCodexへの実装依頼は、GitHub IssueまたはPull Requestレビューに記録する。
- Codexに自動作業を許可する項目にだけ `codex-ready` ラベルを付ける。ラベルのない提案や通常コメントは自動実装しない。
- 依頼には少なくとも「背景」「期待する結果」「受け入れ条件」「対象範囲」「確認に使った根拠」を含める。
- Codexは作業開始時に `codex-in-progress` ラベルを付け、同じ依頼の重複処理を防ぐ。
- Codexは `main` へ直接pushせず、`codex/issue-<Issue番号>` または `codex/review-<PR番号>` ブランチで作業し、テスト結果付きのPull Requestを作る。
- 変更のマージは自動化しない。Claude Codeのレビューとユーザーの確認後に行う。
- 仕様が曖昧、破壊的操作が必要、認証情報が必要、またはテストが失敗した場合は自動で続行せず、理由と確認事項をGitHubに報告する。

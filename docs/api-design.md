# Creative-Destruction-Project

採用向けの音声対話・記録・人による確認をつなぐプロダクトの設計リポジトリです。

## API接続設計 v0.1（2026-10-22）

**レビュー用提案です。実装済み・本番承認済みの仕様ではありません。** 既存の共有Space「HaaS｜採用対話プロダクト」のMVP案・Web構成案を引き継ぎ、接続契約を具体化しました。11月30日は初期機能の完成を目指す目安であり、確定納期として扱いません。

採用する構成案は、GPT-Liveの音声対話、Decisions APIによる会話上の意図分類、Agents APIによる質問進行、Responses APIによる根拠付きのレポート下書きです。アプリが状態・権限・訂正・保存を管理し、人間が記録を確認します。自動採否判定は含めません。

## 読む順序

1. [既存情報・決定と提案の区別](01-context-and-decisions.md)
2. [構成・状態管理・訂正と復旧](02-architecture.md)
3. [Web接続手順・API契約](03-web-api-integration.md)
4. [OpenAI APIの確認結果・認証・料金・制約](04-openai-api-reference.md)
5. [同意・プライバシー・アクセス制御・公平性](05-privacy-security-fairness.md)
6. [受け入れ条件・分担案・残る判断](06-acceptance-and-handoff.md)

Web側は [OpenAPI 3.1](../contracts/openapi.json)、[SSEイベントスキーマ](../contracts/events.schema.json)、[レポートスキーマ](../contracts/report.schema.json)、[架空データ](../contracts/fixtures/)から画面・モック接続を開始できます。OpenAPIのサーバーURLは相対パスで、稼働中のAPIを意味しません。

[プロンプト](../prompts/)と[OpenAIリクエスト例](../contracts/provider-examples.json)はバックエンド向けです。APIキー・実在候補者情報は含みません。プロバイダー例はテンプレートであり、そのまま送信しないでください。

設計の検証範囲は [検証記録](07-validation.md)に記載しています。実マイク・有料API・本番環境での動作確認は別途必要です。

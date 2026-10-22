# Creative-Destruction-Project

採用向けの音声対話・記録・人による確認をつなぐプロダクトの設計リポジトリです。

## API接続設計 v0.3（2026-10-22）

**レビュー用提案です。実装済み・本番承認済みの仕様ではありません。** 既存の共有Space「HaaS｜採用対話プロダクト」のMVP案・Web構成案を引き継ぎ、接続契約を具体化しました。11月30日は初期機能の完成を目指す目安であり、確定納期として扱いません。

公式推奨と照合したv0.3の基準案は、GPT-Live＋client delegation、アプリの固定進行、必要時の単発Responses、根拠付きのレポート下書きです。Agents APIとDecisionsは比較評価して採用する候補に整理しました。アプリが状態・権限・訂正・保存を管理し、人間が記録を確認します。自動採否判定は含めません。

## 読む順序

1. [既存情報・決定と提案の区別](01-context-and-decisions.md)
2. [構成・状態管理・訂正と復旧](02-architecture.md)
3. [Web接続手順・API契約](03-web-api-integration.md)
4. [OpenAI APIの確認結果・認証・料金・制約](04-openai-api-reference.md)
5. [同意・プライバシー・アクセス制御・公平性](05-privacy-security-fairness.md)
6. [受け入れ条件・分担案・残る判断](06-acceptance-and-handoff.md)
7. [動く契約モデル・Web用の型と操作例](08-contract-lab.md)
8. [同時実行・課金・運用・構成の判断](09-operational-decisions.md)
9. [公式推奨との照合・変更理由・内部契約](10-openai-guidance-review.md)
10. [モデル・音声評価の進め方](11-model-evaluation-plan.md)

Web側は [OpenAPI 3.1](../contracts/openapi.json)、[生成済みTypeScript型](../contracts/generated/api.ts)、[4つの通し操作例](../contracts/scenarios/)、[SSEイベントスキーマ](../contracts/events.schema.json)、[レポートスキーマ](../contracts/report.schema.json)から画面・モック接続を開始できます。OpenAPIのサーバーURLは相対パスで、稼働中のAPIを意味しません。v0.2は23操作、未回答のままの終了、一覧取得、質問計画の配信、ログアウトを定義しています。

[プロンプト](../prompts/)と[OpenAIリクエスト例](../contracts/provider-examples.json)はバックエンド向けです。APIキー・実在候補者情報は含みません。プロバイダー例はテンプレートであり、そのまま送信しないでください。

設計の検証範囲は [検証記録](07-validation.md)に記載しています。39件の契約・状態・費用計算テストとTypeScriptの型検査を実行しました。検証モデルは通信しない架空データ専用で、実マイク・有料API・本番環境での動作確認は別途必要です。

公式照合の主な変更は、Liveの委譲用prompt、Agentsの任意化、単発推論の出力schema、出力音声の停止・再開条件、cache料金、18音声評価シナリオです。HTTP契約のv0.2・23操作は維持し、Web担当の接続先は変えません。

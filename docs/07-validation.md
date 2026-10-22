# 設計・契約の検証記録

2026-10-22。OpenAI APIへの有料リクエスト、実マイク、実在候補者データ、既存サービスの変更は行っていない。

## 再実行

Python環境で必要な検証用依存を入れ、リポジトリのルートから実行する。

```sh
python -m pip install -r requirements-contracts.txt
python scripts/validate_contracts.py
```

実行時に外部APIを呼ばない。依存パッケージの取得にはネットワークが必要。契約スキーマはOpenAPI 3.1とJSON Schema 2020-12。

## 確認項目

検証スクリプトは成功：19パス/19操作、13件のrequest/response fixture、6件のSSEイベント、レポート根拠、4件の不正形式、providerテンプレートと文書リンク。検証に用いた依存版はrequirements-contracts.txtで固定している。

- OpenAPIの構文、参照、operationIdの一意性。
- request/response fixtureと各componentの一致。
- SSEのenvelope、typeごとのpayload、seqの順序。
- レポートのschema、訂正後の根拠ID・revision・引用との一致。
- 同意false、訂正未確認、余分な採否スコア、未定義の採否イベントが拒否されること。
- providerテンプレートの保存設定、ブラウザーイベント権限、sandbox不使用、レポートschemaの一致。
- 文書からのローカルリンク。

これらは契約の静的検証であり、サービスの動作試験ではない。RLS、認証、CSRF、OpenAIの実project権限、モデル精度、削除完了、30分接続、レイテンシ、費用、実マイク、人のreviewのE2Eは未検証。A01〜A08の状態は[受け入れマトリクス](06-acceptance-and-handoff.md)を参照する。

原資料は、Slack文字起こし、共有Spaceの仕様案、対象リポジトリ、既存future-companyの特定コミットと公式API資料を照合した。添付会議音声の再聴取はしていない。非公開全文はこのリポジトリに複製していない。

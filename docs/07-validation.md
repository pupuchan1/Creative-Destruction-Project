# 設計・契約の検証記録

2026-10-22。OpenAI APIへの有料リクエスト、実マイク、実在候補者データ、既存サービスの変更は行っていない。

## 再実行

Python環境で必要な検証用依存を入れ、リポジトリのルートから実行する。

```sh
python -m pip install -r requirements-contracts.txt
python scripts/validate_contracts.py
python -m unittest discover -s contract_lab -p 'test_*.py' -v
python scripts/generate_contract_types.py --check
python -m contract_lab.export_scenarios --check
```

実行時に外部APIを呼ばない。依存パッケージの取得にはネットワークが必要。契約スキーマはOpenAPI 3.1とJSON Schema 2020-12。

## 確認項目

v0.2のローカル検証は成功：21パス/23操作、13件のrequest/response fixture、6件の基本SSEイベント、4つの通し操作シナリオ、レポート根拠、4件の不正形式、providerテンプレート、同意hashと文書リンク。検証に用いた依存版はrequirements-contracts.txtで固定している。

実行可能な参考モデルの32件と、usage/試算の7件、合計39件のunittestが成功。TypeScript 7.0.2の`tsc --noEmit --strict`でも生成型と成功/エラー応答の判別、意図的な不正型の拒否を確認した。モデルはHTTP・マイク・外部API・DBを使っていない。GitHub Actionsの追加定義は存在するが、CIの成否はPRの当該commitのcheckを参照する。

- OpenAPIの構文、参照、operationIdの一意性。
- request/response fixtureと各componentの一致。
- SSEのenvelope、typeごとのpayload、seqの順序。
- レポートのschema、訂正後の根拠ID・revision・引用との一致。
- 同意false、訂正未確認、余分な採否スコア、未定義の採否イベントが拒否されること。
- providerテンプレートの保存設定、ブラウザーイベント権限、sandbox不使用、レポートschemaの一致。
- 文書からのローカルリンク。

静的なschema検査と、架空データの状態モデルの動作試験を行った。実サービスの動作試験ではない。RLS、JWT認証、CSRF検証、OpenAIの実project権限、モデル精度、providerの削除完了、30分接続、レイテンシ、実費、実マイク、人のreviewのE2Eは未検証。A01〜A08の状態は[受け入れマトリクス](06-acceptance-and-handoff.md)を参照する。

原資料は、Slack文字起こし、共有Spaceの仕様案、対象リポジトリ、既存future-companyの特定コミットと公式API資料を照合した。添付会議音声の再聴取はしていない。非公開全文はこのリポジトリに複製していない。

## v0.3の追加範囲

OpenAI公式ガイド18グループと関連のsession管理を読み、設計判断への対応表を追加した。Live/Agents/report promptを改訂、単発Responses promptと内部next-step schema、18件の音声試験仕様を追加した。これらの形式・参照・権限引数の拒否・provider例との整合をofflineで確認する。音声仕様のstatusはnot_runであり、CIはモデルの成績を出さない。

追加2件の原価テストはcache read/writeの単価置換と不整合拒否を検証する。公開HTTP/SSE型と既存4通しシナリオに変更はない。独立したreport fixtureのprompt版は更新した。CIはprompts変更でも起動する。新しい実測結果・実装済みadapter・録音は追加していない。

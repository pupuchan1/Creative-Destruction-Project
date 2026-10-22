# 実行できる契約とWebへの引継ぎ v0.2

前回の静的fixtureに加え、状態を変化させて検証できる架空データ専用のモデルを追加した。OpenAI、マイク、ネットワーク、実DB、実認証には接続しない。プロバイダーイベントはテストから明示的に注入し、レポートは発話をそのまま並べる決定的なfixtureである。

## 今回修正した具体的な抜け

| 前回の不足 | 修正 |
|---|---|
| transcript_versionの最小値1により、無回答終了が型で拒否される | finish/report/job/gap reviewで0を許可。全項目unconfirmedの通しケースを追加 |
| 画面が質問文を取得できず、一覧APIもない | snapshotにtemplate/current_question_idを追加。質問版・面談一覧と版取得を定義 |
| 同意撤回がexpected_revisionの競合で遅れ得る | 撤回はrevisionを要求しない。pause/cancel/人への相談も古いrevisionだけで拒否しない |
| 最後の音声接続だけ正常なら過去の欠落が隠れ得る | gapsを保持し、人の確認をtranscript_versionに固定。訂正で失効 |
| 冪等キャッシュから失効前の成功を返す危険 | 認証・割当・失効をキャッシュ照合より前に検証 |
| レポート例に訂正後の根拠にない過去の数値が混在 | 正規テキストの引用に限定。旧revision、別質問、存在しない引用を拒否 |
| 同意hashが説明用のダミー値だけ | 表示文書のcanonical JSONからSHA-256を生成し整合検査 |
| 本文の削除対象がDB中心に読める | SSE、訂正監査、冪等応答、ジョブ、二次キャッシュも削除対象とする |

## ファイルと使い方

| ファイル | 用途 |
|---|---|
| [generated/api.ts](../contracts/generated/api.ts) | 23操作のrequest/response、path parameter、snapshot、SSEの判別union、reportの型 |
| [generated/routes.json](../contracts/generated/routes.json) | operationId→method/path/roleの対応。ブラウザーで権限を保証するものではない |
| [text-correction-review.json](../contracts/scenarios/text-correction-review.json) | 同意→回答→5年から3年へ訂正→終了→下書き→人の確認 |
| [empty-interview.json](../contracts/scenarios/empty-interview.json) | 回答せず終了し、すべて未確認として扱う |
| [gap-human-review.json](../contracts/scenarios/gap-human-review.json) | 音声終了未確認で409→人が欠落確認→候補者確認→下書き |
| [withdrawal-deletion.json](../contracts/scenarios/withdrawal-deletion.json) | 撤回→遅い結果を破棄→削除の未完了/完了を区別 |
| [contract_lab/model.py](../contract_lab/model.py) | 状態・割当scope・訂正・世代・冪等性・削除の実行可能な参考仕様 |
| [contract_lab/test_model.py](../contract_lab/test_model.py) | 32件の状態・競合・拒否・根拠検証テスト |
| [contract_lab/costs.py](../contract_lab/costs.py) | 累計usageを二重加算せず、再接続と最終化未確認を区別する試算 |
| [next-step.schema.json](../contracts/next-step.schema.json) | v0.3で追加した内部の対応提案。WebのHTTP型は変更しない |
| [voice-scenarios.json](../contracts/evaluations/voice-scenarios.json) | 18件の音声試験仕様。実行ハーネス・試験結果ではない |

Webは静的JSONの`initial_snapshot`を表示し、`steps`のrequest/response/snapshotを順にモックへ返せる。`kind:server_fixture`は裏側の仮イベントであり公開APIではない。実際の音声やログイン成功を示す表示は出さない。生成レポートのmodel名は`offline-fixture`で、本物のモデルを呼んだように表示しない。

TypeScriptでの利用例：

```ts
import type { AppEvent, RequestOf, ResponseOf } from './contracts/generated/api';

const finish: RequestOf<'finishInterview'> = {
  expected_revision: snapshot.revision,
  confirmed_transcript_version: snapshot.transcript_version,
  confirmed: true,
};

function showReport(response: ResponseOf<'getReport'>) {
  if (response.status === 200) return response.body.content;
  if (response.status === 202) return { waiting: response.body.operation_id };
  return { error: response.body.error.code };
}
```

型はコンパイル時の支援であり、Cookie、JWT、CSRF、RLS、JSONの実行時検証を実装したことにはならない。`Actor`も検証済み主体を模したfixtureであり、リクエストからそのままactor/tenantを作ってはならない。参考モデルが扱うのは面談1件の13操作。企業ログイン、招待作成/交換、一覧、ログアウト、DBでの原子性、実SSE配信は別途実装する。

## 再実行と生成物の更新

```sh
python -m pip install -r requirements-contracts.txt
python scripts/build_contracts.py
python scripts/generate_contract_types.py
python -m contract_lab.export_scenarios
python scripts/validate_contracts.py
python -m unittest discover -s contract_lab -p 'test_*.py' -v
```

既存WebプロトタイプのTypeScript 7.0.2で型検査した。Webブランチを統合した環境では同じcompilerを使う。

```sh
npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler contracts/types-smoke.ts
```

生成元は[scripts/build_contracts.py](../scripts/build_contracts.py)。OpenAPI・schema・基本fixtureを直接編集して生成元と分岐させない。型は`generate_contract_types.py --check`、通し操作例は`python -m contract_lab.export_scenarios --check`で更新漏れを検知できる。[CI定義](../.github/workflows/contract-validation.yml)も追加した。GitHub上での実行結果とローカル結果は別に報告する。

## v0.1からの移行

OpenAPIのversionは0.2.0。WithdrawalCreateのexpected_revisionは削除し、snapshotにはtemplate/current_question_id/gaps/finalization_review_transcript_versionを追加した。古いfixtureと新しい型を混ぜない。API routeは同じ`/api/v1`案のまま、本番リリース前の契約を更新している。既存の未接続503型はWebとbackendを同時に新しいError型へ移行する。

シナリオには架空の操作履歴を意図的に残している。実候補者でこのexport処理を使ったり、同様の全文ログを取得したりしてはならない。

# 既存情報と決定状況

確認日：2026-10-22。日付の会話上の基準は日本時間。本文中の「新提案」は今回の設計判断であり、関係者の合意を代弁しません。

## 根拠と扱い

| ID | 確認した資料 | 分かったこと・限界 |
|---|---|---|
| S1 | [10月21日のSlack会話](https://devdaycommuni-qzr8743.slack.com/archives/D0C9GRC24R4/p1792552628571719)および同DM内の前後の文字起こし | 採用へ絞る方向、AI/APIとWebの分担案、11/30と12月の目安。複数話者が混在する自動文字起こしであり、投稿者がすべて発言したとは判断しない。添付音声そのものの照合は未実施。 |
| S2 | [共有Space：HaaS｜採用対話プロダクト](https://chatgpt.com/space/page_6ad827cb69588191b40400552d383652) v0.2 | プロダクト方針・MVP・決定ログ・作業ルールがすでに存在。詳細をゼロから作る状況ではなかった。閲覧には権限が必要。 |
| S3 | [プロダクト方針](https://chatgpt.com/space/page_6ad828862cac81919dbe52a758618073)・[MVP案](https://chatgpt.com/space/page_6ad8288a3adc819199a765c887655842) | 企業設定→招待→同意→対話→根拠付き記録→人による確認。訂正、未確認事項、再接続、企業間分離が要件案。初回面接前の情報収集は仮説。 |
| S4 | [決定ログ](https://chatgpt.com/space/page_6ad8288ddaac8191a55e166bf8f3f86e)・[作業ルール](https://chatgpt.com/space/page_6ad828933e2081918a2731e817592110) | 分担・期限・初期機能の確定度を区別。T009「API契約とモック応答」が未整備。本設計はその具体化。 |
| S5 | [Web技術選定案](https://chatgpt.com/space/page_f073c7c45d90819197148460c40342d8) v0.1 | React/TypeScript/Vite、Hono/Workers、Node音声サーバー、PostgreSQL/Supabase、Auth/Storage、キューという案。採用決定ではない。 |
| S6 | [議事録・参考資料](https://chatgpt.com/space/page_6ad828973a9c81919011987353f8cb71)・[既存実装補足](https://chatgpt.com/space/page_6ad833ce2a58819182835b9bfddb178e) | future-companyのLive/Agents実装を参照できる。合成音声E2Eの報告はあるが、本製品の実マイク・人による確認の実証ではない。 |
| S7 | [対象リポジトリの確認時点](https://github.com/pupuchan1/Creative-Destruction-Project/tree/60144773e8911809f193fbc2912b0f8829eacf5d) | mainはプロジェクト名のみのREADME。コード、API定義、Issue、PRは見つからなかった。書き込み権限を確認。 |
| S8 | [future-companyの参照コミット](https://github.com/pupuchan1/future-company/tree/7a988afae53a4b69ff7f3f346a2e786853d143ad) | integration/live-session.mjs、backend.mjs、interview.mjs、frontend/LIVE-INTEGRATION.mdを読んだ。既存環境を変更・再デプロイしていない。 |
| S9 | [画面プロトタイプの再確認時点](https://github.com/pupuchan1/Creative-Destruction-Project/tree/459fbfe2983ad3511f067086adbe9b285cbe991a)（feat/haas-screen-prototype） | 作業終了前の再取得で新ブランチを確認。React画面、Honoの503応答、Zodエラー型、3状態の業務型、navigation/security文書が存在。mainには未反映で、実API・音声・DBは未接続。接続対応表を本設計に追記した。 |

LibraryとGoogle Driveでも関連名称を検索したが、この設計に追加すべきプロジェクト仕様は取得できなかった。これは共有資料全体に仕様が存在しないという証明ではない。非公開会話の全文・音声・メール・個人情報はこの公開リポジトリに転載しない。

## 合意・方向性・新提案

| 項目 | 現状 | 本設計での扱い |
|---|---|---|
| 共有Spaceに議論と仕様を整理する | 既存ログ上の明示的依頼 | 既存文書を再利用し、接続契約を追加 |
| まず採用領域に絞る | 会話で強い方向性を確認 | 採用向け情報収集の対話を対象に設計 |
| 顧客・職種・新卒/中途・採用のどの段階か | 未決 | 職務に関係する共通質問テンプレートを前提とする仮設計 |
| 11/30までに主要機能、12月にマーケティング | 目安・提案。機能範囲との確定合意なし | 納期・予算・広告配信の承認として扱わない |
| 一方がGPT/API/プロンプト、他方がWeb FE/BE | 分担案。詳細の担当・レビュー権限は未確定 | AI担当／Web担当という役割で接続責任を記載 |
| Live＋Agent＋意思決定処理 | 会話・既存実装に構想あり | 正式API名、イベント、エラー、保存責任を具体化 |
| 同意・訂正・保存・人による確認 | 既存MVPの要件案 | v0.1の必須受け入れ条件として提案 |
| 自動採否、人物像・感情の推定を除外 | 既存MVP案に整合する安全境界 | 自動採否のAPI・スコア欄を設けない |
| 30分、文字記録30日、音声原本を保存しない | 今回の運用初期値の提案 | 顧客・法務・運用責任者の確認前に本番既定値としない |
| API契約、revision、冪等性、SSE、同意ポリシー | 今回の新提案 | モック実装開始用。レビュー後にv0.1を固定 |

## 既存実装から再利用するもの

LiveのSDP接続・sideband、Agentsの関数呼び出し処理、Webから音声サーバーへの署名付き中継の考え方は再利用候補。既存コードはNode 24系、OpenAI JS SDK 7.38.0を使用している。

新製品には、候補者単位の同意・企業分離・永続イベント・訂正履歴・保持期間が追加で必要。既存のメモリー内イベント上限や末尾文字列の切り出しを正本にしない。既存の意図分類閾値を採否判断や確定操作の許可として流用しない。既存のSlack通知・人へのタスク委譲・汎用ツール群は初期面談に持ち込まない。既存D1/DOデータの移行、デモ環境の変更は本設計に含めない。

今回の提案ではAgentsの`environment: none`を使用する。既存のhosted sandboxからの変更提案であり、面接進行にコード実行環境が不要なため。会話の保持制約はnoneでも変わらない。

S9の画面とモノレポ構成は新製品の実装基盤として再利用する。今回の文書PRはmainを基点とする追加ファイルのみとし、別ブランチのREADME・画面・コードを置換しない。入口は[API設計インデックス](api-design.md)。正式マージ時にプロトタイプ側READMEからリンクする。

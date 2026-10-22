# OpenAI公式ガイドとの設計照合 v0.3

確認日：2026-10-22。API項目の存在確認に加え、推奨設計・失敗時の挙動・評価方法を本文まで読んで現行案を照合した。以下は**新しい設計提案**であり、pupuchanとの合意追加や本番動作の検証を意味しない。公開Web契約はv0.2の23操作を維持する。

## 今回変えた判断

| v0.2の不足 | v0.3の提案 | 判断の位置づけ |
|---|---|---|
| Liveへの委譲指示が一般的な文章だけ | 専用記法と3つのpolicy見出しを導入。会話と業務規則を分離 | 公式の明示的推奨を反映 |
| Agents APIを質問進行の基準にしていた | アプリの固定進行＋必要時の単発Responsesを基準にする。Agentsは比較候補 | 公式のruntime比較を採用要件へ当てはめた設計判断 |
| 「承認済み質問を話す」というpromptを制御保証と混同し得る | アプリの許可・保存と実際の発話を別々に検証。厳密な事前音声検査には別経路が必要 | 公式の再生制御・guardrailの限界を反映 |
| 実音声評価の方法が概略のみ | 委譲、訂正、停止、根拠、実再生、遅延を評価する18シナリオと段階的な実行計画を追加 | 公式評価方法を製品向けに具体化 |
| 非cached利用量の試算のみ | cache read/writeを排他的な料金区分として計算する | 公式cache課金の扱いを反映 |
| 廃止予定の評価・prompt機能との区別がない | promptはリポジトリで版管理、評価データはAPI非依存。旧Evals/Agent Builderへ新規依存しない | 公式deprecationを反映 |

## 推奨構成と代替案

**基準：GPT-Live＋client delegation＋アプリの進行管理＋必要時の単発Responses。** 現在の`gpt-live-1`、`gpt-6.1-sol`を比較の基準として維持する。Decisionsの`gpt-6-luna`は限定した操作意図分類の候補で、日本語評価後に有効化する。新モデルへ自動更新しない。

公式は簡単に始める経路としてResponses delegationを案内する一方、返却前の検査・編集や文脈の厳密な選択にはclient delegationを挙げている。本製品では訂正後の正本、同意失効、旧generationの破棄をLiveへ返す前に確認したいため、client delegationを維持する。**これは公式が採用製品に特定構成を認証しているという意味ではない。** [G2]

| 経路 | 使用条件 | 初期判断 |
|---|---|---|
| アプリの固定進行 | 次の承認済み質問、停止ボタン、訂正の保存、同意撤回 | 常に優先。モデル不要 |
| client→単発Responses | 意味が不明な回答への対応、操作希望、範囲内の確認提案 | 基準。1回の出力をschemaと正本で検査 |
| client→Agents API | 継続的な複数ツール作業が実際に必要になった場合 | 任意の比較案。`environment:none`、限定2ツール。効果・保持・削除の評価後に採用判断 |
| LiveのResponses delegation | 入力文脈とbackend結果の自前制御が不要な会話 | 比較候補。現在の厳密な返却前検査条件では基準にしない |
| ASR→検証済みテキスト→TTS | 全文の事前審査や逐語の質問・説明が必要 | 要件次第で優先。自然さと遅延を実測して選ぶ |

Agents APIはOpenAIがharnessと状態を管理する仕組みで、Agents SDKとは別物。単発の確認案に必ずしも長期セッションは要らない。既存コードがあることだけで採用せず、構成を増やす利益を評価する。[G4][G5] `store:false`のResponsesでもproviderのキャッシュ・abuse log等がゼロになるわけではない。[G10]

## 公式推奨と実装への対応

「反映」は文書・prompt・契約への反映。実サービスの検証状態は全て[評価計画](11-model-evaluation-plan.md)を参照する。

| ID | 公式で確認した要点 | 本製品での対応 | 確認方法・残る条件 |
|---|---|---|---|
| P01 | 会話用promptを短くし、詳細な業務手順をbackendへ置く [G1] | Liveは会話・相づち・委譲、backendは次の対応の提案に分離 | prompt差分とV01〜V04 |
| P02 | 委譲専用の記法を使用し、不要な委譲も指定する [G1] | `Generate <\|SpawnThinking\|>`と3見出しを使用 | 「確認しています」という音声だけで開始扱いにしない。delegationイベントで検証 |
| P03 | 文脈の構築・結果の検査が必要ならclientを選ぶ [G2] | 世代・根拠検査を通った短い結果だけ返す | stale結果と二重委譲の試験 |
| P04 | 発話の割り込みとbackend取消は別 [G2] | 再生停止、ジョブ取消、世代失効を別々に実施 | V04/V05。cancel成功だけを信頼しない |
| P05 | sidebandは再生を制御しない [G3] | Web側に出力mute・待機音声破棄・再開条件を実装 | V16。ackで自動再開しない |
| P06 | 転記断片は完全なターンでなく誤りもある [G2] | 正本・未確定・訂正を維持し、断片で終了しない | V06/V09/V12と既存状態モデル |
| P07 | 単純な処理はcode、不要なモデル呼出を減らす [G6] | 固定質問はアプリ、必要時だけ単発推論 | API回数と有用な次質問までの時間を比較 |
| P08 | 関数は小さく、既知のIDはモデルに埋めさせない [G7] | 権限ID・generationはサーバー束縛。任意Agentsの関数も2個だけ | schemaの余分な権限引数を拒否 |
| P09 | JSONの形と事実の正しさは別 [G8] | 次の対応とレポートをstrict出力にし、別途ID・revision・引用を照合 | 捏造ID・古い根拠・意味の飛躍を個別評価 |
| P10 | 高い影響を持つ出力は人が元情報を確認できるようにする [G9] | 全レポートを下書き扱いにし、根拠・不足・訂正をreview画面へ | 人による意味の忠実性確認。採否決定なし |
| P11 | ログ・traceにも入力、出力、ツール内容が含まれ得る [G10][G11] | 本文を通常の運用ログに出さず、保護された正本から権限付き参照 | Agents比較時はtrace/exportも保持・削除対象として調査 |
| P12 | task成功、音声品質、接続失敗は分けて評価 [G12][G13] | 18音声シナリオ＋20意図ケース。無効試験と製品失敗を別記 | 実行は未実施。合成・同意済み録音・複数ターンの順 |
| P13 | 小規模な実タスク評価を継続し、人の判定と合わせる [G14] | 変更前後を同じ入力で比較。期待値は実行対象へ渡さない | holdoutと開発用を分け、失敗例を蓄積 |
| P14 | 接続pool再利用、短い結果、キャッシュ、独立処理の並行化 [G2][G15] | クライアント再利用。JSON途中streamは音声へ流さない。固定promptは先頭、候補者データは後ろ | schema完成・検証を待つ遅延を明示。速さだけで安全条件を緩めない |
| P15 | 再試行前に実際の結果・副作用を照合 [G16] | 同一operationの冪等性、回数上限、失効照合を維持 | 429/5xx/切断と重複作成の試験 |
| P16 | 環境の分離、キー期限・ローテーション、使用量管理 [G17] | 開発・本番projectを分離し、service keyをサーバーだけへ配置 | 実project設定は未確認。baselineにAgents権限を追加しない |
| P17 | 旧Evals、prompt objects、Agent Builderに終了予定あり [G18] | promptと評価入力はrepo管理、旧サービスのIDに依存しない | リリース前にdeprecationを再確認 |

## アプリが強制する内部契約

入力はサーバーが構築する。`operation_id/interview_id/connection_id/delegation_id/generation/transcript_version/context_hash`はジョブに固定し、モデルの出力で変更できない。モデルに渡すのは現在の質問、許可済み次質問ID、必要な範囲の訂正後発話とrevision、直前の質問・操作状態。全文の単純な末尾切捨てや過去の自動要約を正本としない。予算内に収まらなければ必要な質問範囲に絞り、欠落を明示する。

[NextStepProposal](../contracts/next-step.schema.json)は**アプリ独自の内部出力契約**。OpenAI固有のresponse形式ではない。`responses_next_step`例のstrict JSONに使用し、Agentsの`propose_next_step`でも同じ構造を返す。[provider例](../contracts/provider-examples.json)は送信未実施のテンプレート。

返却時は順番に確認する。

1. 成功statusか。refusal/incomplete/timeoutなら提案を適用せず確認または人へ回す。JSONの途中を修復して成功扱いにしない。
2. 同意・担当権限・接続owner・generation・transcript_versionが現在と一致するか。依頼中に正本が変わった場合、古い結果を捨てる。
3. schema、question_idの許可集合、全utterance参照の話者・revisionが正しいか。根拠を別面談から補わない。
4. `ask`は許可済み次質問、`repeat/clarify`は現在の質問。それ以外のquestion_idはnull。`clarification_text`はclarify以外null。
5. `ask/repeat`はアプリの承認済み文を使用する。初期`freeform_clarifications=false`ではclarifyも現在の質問を言い直し、モデルの自由な確認案はそのまま読ませない。範囲を広げる場合は質問の関連性・公平性評価を先に行う。
6. pause/withdrawal希望では入力と新規ジョブを一旦止める。訂正・終了・撤回の確定は既存UI/APIで行う。提案結果を直接`finish`や`consent-withdrawal`へ変換しない。
7. 検証済みの短い結果を対応するdelegation IDへ一度返す。`thinking`は背景、`commentary`は発話候補、`instructions`はアプリ作成の制御指示。候補者原文をinstructionへ昇格させない。

同じ委譲の再送と、同じ発話から生じた複数委譲を`operation_id＋context_hash＋generation`で調整する。初期案は対話中のactive backendジョブ1件、1提案1モデル呼出。追加リトライは同じ文脈が有効な場合だけ。必須の状態確認を遅延短縮のため並行で飛び越えない。

連続した訂正・発話によって結果がstaleになる間は、最新の文脈へ依頼をまとめる。相づちや同じ字幕断片だけで新しいモデル依頼を繰り返さない。世代不一致を解消するために安全確認を省くのではなく、上限に達したら待機・文字での確認・人への相談へ移る。Liveの並行会話が無限の再要求を生まないこともV04/V11で計測する。

## 音声と説明を保証できる範囲

事前の同意文はWebに固定版を表示して同意記録へ結びつける。Liveに読ませた音声や受領ackを同意成立・説明到達の証拠にしない。逐語の音声説明が必要なら検証済みクリップをアプリで再生して完了を観測する。再生完了でも理解・同意を推定せず、本人の明示操作を別に取る。[G3]

MVPの直接WebRTC再生は、全音声の再生前検査を保証しない。字幕の事後監視、自由な確認文の制限、訂正・停止はリスクを減らすが、すでに聞こえた音声は戻せない。これを許容できない顧客には、出力buffer＋検査やASR→テキスト→TTSを選ぶ。bufferでは音声区間・対応転記・検査timeout・割込後の古い再生許可を自前管理する必要がある。[G3]

重要な訂正・guardrail発動後は、出力を止め、待機音声を破棄し、サーバーの正本更新と旧結果の失効を確認する。旧音声やLiveの旧文脈を安全に切り離せない場合は接続を閉じ、正規テキストから新セッションで再開する。mute解除やinstruction ackだけを再開条件にしない。単なる「話を止めて」でDB処理の取消完了を表示しない。

## 性能・データ・変更管理

推論モデルは`gpt-6.1-sol/low/default`を比較の基準とする。次の対応は最大1,024 output tokens、レポートは4,096を仮上限とし、reasoning分も含む上限到達をincompleteとして扱う。数値は公式推奨値ではなく、評価で調整する予算案。Fast等は品質・実費・遅延を同時に比較してから選ぶ。

cacheの再利用率は保証しない。候補者別のopaque cache keyを使う場合も認可の代わりにはならない。GPT-6系の最小cache保持設定と最大保持を混同せず、`store:false`でも処理先の保持条件を説明する。12h保持を速さのため自動選択しない。費用は通常入力・cache read・30m write・12h writeを重複せず分類する。[G10][G15]

運用ログはrequest/operation ID、prompt/schema版、model、tier、エラー種別、token/秒、処理時刻を基本とする。原文・音声・自由記述のtraceを監視基盤に複製しない。評価用の音声は架空内容でも録音者の許可を取り、閲覧者・保存期限を定める。実候補者録音を黙って評価資産へ流用しない。[G9][G11]

今回の公式ページには旧Evalsを推奨する歴史的な本文も残るが、deprecationsの予定を優先して設計する。旧Evalsは2026-10-31からread-only、11-30にdashboard/API終了予定。同日には`v1/prompts`のprompt objectsとAgent Builderも終了予定。これはAgents API、Agents SDK、Responses、評価という手法そのものの終了を意味しない。[G18] 本設計の11/30目安とは別の、外部サービスの日程である。

## 読んだ一次資料

すべてOpenAI公式、2026-10-22に本文を確認。全ドキュメントを網羅したという主張ではなく、この設計に関係する推奨・制約の照合範囲を示す。

- G1 [GPT-Live prompting / Recommended prompt structure](https://developers.openai.com/api/docs/guides/live-prompting)
- G2 [GPT-Live delegation / mode選択・context・latency](https://developers.openai.com/api/docs/guides/live-delegation)
- G3 [Live server controls / guardrails・playback](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live) と [disclosure・session管理](https://developers.openai.com/api/docs/guides/live-conversations)
- G4 [Agents / runtime比較](https://developers.openai.com/api/docs/guides/agents)
- G5 [Agents API architecture / environmentなし](https://developers.openai.com/api/docs/guides/agents-api/architecture)
- G6 [Latency optimization / fewer requests・code優先](https://developers.openai.com/api/docs/guides/latency-optimization)
- G7 [Function calling / best practices・strict](https://developers.openai.com/api/docs/guides/function-calling)
- G8 [Structured Outputs / errors・refusals](https://developers.openai.com/api/docs/guides/structured-outputs)
- G9 [Safety best practices / human review・adversarial tests](https://developers.openai.com/api/docs/guides/safety-best-practices)
- G10 [Your data / endpoint別の保持条件](https://developers.openai.com/api/docs/guides/your-data)
- G11 [Agents tracing / recorded inputs・outputs](https://developers.openai.com/api/docs/guides/agents-api/tracing)
- G12 [Voice agents / architecture・evaluation・latency](https://developers.openai.com/api/docs/guides/voice-agents)
- G13 [GPT-Live evaluation Cookbook / Crawl・Walk・Run](https://developers.openai.com/cookbook/examples/audio/voice_agent_evaluation)
- G14 [Evaluation best practices / task-specific tests](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- G15 [Prompt caching / model差・write/read・保持](https://developers.openai.com/api/docs/guides/prompt-caching)
- G16 [Agents errors and recovery / retry・stream断](https://developers.openai.com/api/docs/guides/agents-api/errors)
- G17 [Production best practices / key管理・環境分離](https://developers.openai.com/api/docs/guides/production-best-practices)
- G18 [Deprecations / Evals・Reusable prompts・Agent Builder](https://developers.openai.com/api/docs/deprecations)

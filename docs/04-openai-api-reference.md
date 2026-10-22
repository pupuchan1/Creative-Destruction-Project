# OpenAI API確認結果

確認日：2026-10-22。公式公開ドキュメントの記載であり、このプロジェクトのAPIキーによるアクセス可否・上限・実測性能の確認ではない。ベータ仕様・価格・利用規約は実装開始時と公開前に再確認する。

## 基準案と比較候補（v0.3）

| 役割 | 正式API・モデル | 認証・使い方 | 制約 |
|---|---|---|---|
| 双方向音声 | GPT-Live / `gpt-live-1` | サーバーから`POST /v1/live/sessions`、Bearer project API key、WebRTC SDP交換 | 音声/文字対応。画像・動画・Structured Outputsなし。原音声保存は初期案でoff |
| 操作意図分類の比較候補 | Decisions / `gpt-6-luna` | `POST /v1/decisions`、Bearer、`api.decisions.write` | public beta、現時点でLunaのみ。確率は採否・本人同意の証明ではない |
| 継続的処理の比較候補 | Agents / `gpt-6.1-sol` | `/v1/agents/sessions`、`OpenAI-Beta: agents=v1`。JS SDKは`client.beta.agents` | サーバー側永続セッション。ZDR不可、削除まで保持。ツールはアプリ実装 |
| 次の対応の提案・構造化下書き | Responses / `gpt-6.1-sol` | `POST /v1/responses`、`store:false`、`text.format`にstrict JSON Schema | schemaに一致しても事実性は保証しない。refusal/incompleteを別処理 |

根拠：[Live](https://developers.openai.com/api/docs/guides/live)、[Liveモデル](https://developers.openai.com/api/docs/models/gpt-live-1)、[Decisions](https://developers.openai.com/api/docs/guides/decisions)、[Agents quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart)、[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)。

「GPT Live」は今回、上記の正式なGPT-Live APIに対応づけた。Realtime APIの`/v1/realtime/calls`やclient secret発行手順を混ぜない。音声利用可能なOpenAIプロジェクトで実接続を確認するまでは利用承認済みとは扱わない。

## 接続・権限

APIキーはNode/ワーカーのsecret managerに置き、ブラウザー、ビルド成果物、プロンプト、ログへ出さない。環境別のproject/keyを分ける。基準案にはLive/Responsesの必要権限だけを与える。Agents比較時は`api.agents.read`・`api.agents.write`・`api.responses.write`、Decisions比較時はその権限を追加検討する。Liveの利用可能範囲とproject quotaは管理画面と接続テストで確認する。サービスの失効・ローテーション手順を用意する。

Liveは`transport:{type:"webrtc",sdp:offer}`と`session`を送信し、返却の`session.id`と`transport.sdp`を使う。sidebandは`wss://api.openai.com/v1/live/sessions/{session_id}/attach`へサーバーキーで接続する。ブラウザーにはSDP answerのみ返し、provider IDはサーバー内の接続レコードに保存する。

`client.data_channel.allowed_client_events:[]`を明示する。省略はすべて許可である。serverイベントも必要最小限を明示する。WebRTC作成後の`session.start`送信は不要。根拠：[WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)、[server controls](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live)、[Live create reference](https://developers.openai.com/api/reference/resources/live/methods/create)。

## Liveとアプリの境界

`delegation:{type:"client"}`を固定し、アプリが固定進行または必要時の単発Responsesを実行する。Agents APIは比較候補とする。`session.delegation.created`はID等のメタデータで、依頼文や文字記録そのものではない。アプリが保存済み文脈を組み立てる。ネイティブDecisions triggerも存在するが、Decisionsを採用する場合も断片ごとの呼出増加を避け、まとまった発話に対する明示呼出を使う。

| イベント | 処理 |
|---|---|
| session.input_transcript.delta / output_transcript.delta | event_id、delta、start_ms、end_msを保存。発話確定イベントはない |
| session.delegation.created | 当該delegation IDと現在generationを記録し、バックエンドへ依頼 |
| session.thinking.append | 静かな背景情報・訂正内容。独自event_idとdelegation_idを指定 |
| session.commentary.append | 次の質問・確認文を話すための内容。逐語的な読み上げは保証されない |
| session.instructions.append | サーバーが承認した指示の追記。候補者の原文をinstruction扱いしない |
| session.input_audio.mute / unmute | ackを確認。入力だけに作用し、出力再生や外部Agents処理を停止しない |
| session.usage.updated / session.closed | 秒数は累計値を置換。最終closed前に切れた場合は最終課金未確認 |

追記3種のcontentは各500token以内。`delegation_id`は既知のclient delegation ID、または非delegation処理のnull。ackは受領の確認であり、候補者が聞き終えた証明ではない。法的な同意は画面の固定文書で取得する。

モデル・voice・delegation modeは起動時に固定し、変える場合は新セッションとする。初期履歴は最大128メッセージ・合計8192token、instructionsは16384token以内。contextは128kで内部要約があり、正本の代わりにしない。公開資料から確認できない最大通話時間をRealtime由来の値で埋めない。30分の製品上限案はアプリ独自設定であり、連続稼働試験が必要。

`store:false`を使う。`store:true`はproject側の利用可否があり、保存recording/forkは別機能。公開の保存済みLiveセッション削除APIは確認できなかったため初期設計で依存しない。再開はアプリの正本から新しいセッションを作る。

根拠：[client delegation](https://developers.openai.com/api/docs/guides/live-delegation)、[session management](https://developers.openai.com/api/docs/guides/live-conversations)、[Decisions voice](https://developers.openai.com/api/docs/guides/decisions-voice)、[prompting](https://developers.openai.com/api/docs/guides/live-prompting)。

## Agents・Decisions・Responsesの実装条件

Agentsを比較試験する場合は`environment:{type:"none"}`でコード実行環境を持たせず、初回inputを同時に渡す。これは今回の提案。`agent.tools`にJSON Schemaで関数を定義し、`agent.session.requires_action`の`required_actions`から未処理のcallを取り出す。戻り値は同じsessionへ`agent.session.input.tool_result`を送り、`turn_id`・`call_id`を一致させる。JSON結果は文字列化して`output`へ入れる。失敗は`success:false`とerrorで返す。

`agent.session.idle`やstreamの終了だけで完了扱いにせず、root turnのcompletedと出力検証を確認する。切断時は保存されたsession/itemsを照合し、既存ターンを重複投稿しない。冪等キーは論理操作ごとに固定する。`agent.session.input.cancel`は副作用を巻き戻さない。会話終了後の不要なsessionは`DELETE /v1/agents/sessions/{id}`で削除し、失敗は期限付き削除ジョブで追跡する。

根拠：[configuration](https://developers.openai.com/api/docs/guides/agents-api/configuration)、[functions](https://developers.openai.com/api/docs/guides/agents-api/tools/functions)、[events/recovery](https://developers.openai.com/api/docs/guides/agents-api/sessions/events)、[management/deletion](https://developers.openai.com/api/docs/guides/agents-api/sessions/manage)。

Decisionsは`questions:[{type:"choice",name,instructions,choices:[{value}]}]`。`answers`のtype/refusal、choice、confidence、probabilitiesを検証する。曖昧・拒否・未定義値は`unclear`へ倒す。終了・訂正はconfidenceに関わらず本人の確認が必要。固定閾値の有効性は未検証であり、ラベル付き日本語ケースで校正する。SDK例の最低JS版は7.30.0、既存実装の7.38.0はこの基準を満たすが、本リポジトリでインストール・実行はしていない。

Responsesの生成対象はnext-step提案またはreport本文。モデルに権限ID・generationを決めさせず、アプリがジョブへ固定する。reportのinterview_id、version、生成日時もアプリが付ける。schema違反、refusal、incomplete、存在しない根拠ID、訂正前の引用は保存前に拒否する。再生成上限後は`failed`として人の確認へ渡す。

## 価格と予算（USD、税別の公開単価）

| 利用 | 確認した単価 | 注意 |
|---|---|---|
| gpt-live-1 | $0.05/分、秒単位 | 無音・backend待ちも含む。初期15秒は稼働分に充当される前払いで、常に15秒を追加する意味ではない。起動失敗・放棄時にも費用が残り得る |
| Decisions / gpt-6-luna | 入力100万tokenあたり$0.10 | このAPIでは入力のみ。通常ResponsesのLuna出力単価を混用しない |
| gpt-6.1-sol Standard | 入力$2.00、cached input $0.10、出力$10.00 /100万token | reasoningも出力に含む。cache writeは通常入力に加算せず、そのtoken区分の単価を置き換える。Fastは2倍、Ultrafastは6倍 |

30分の例：Live 30×0.05=$1.50、次の対応＋下書き合計で非cached入力40,000・出力8,000tokenなら$0.16、Decisionsを40回×2,000入力tokenなら$0.008、合計**$1.668/面談**。これは仮の利用量による試算であり見積保証ではない。再試行、長い履歴の繰返し入力、地域追加料金、cache write、ホスティング、DB、転送、税、人の確認工数を含まない。

v0.3もStandard（service_tier:default）＋reasoning lowを基準として提案。既存コードのfastからの変更で、速度と費用を実測比較する。272kを超える長文料金条件や地域料金も適用され得るため、長い全文を毎回送り続けない。`environment:none`でsandboxは使わず、hostedへ変更する場合はcontainer費用を足す。

参考：[pricing](https://developers.openai.com/api/docs/pricing)、[voice cost](https://developers.openai.com/api/docs/guides/voice-latency-cost?api=live)、[Solモデル](https://developers.openai.com/api/docs/models/gpt-6.1-sol)。

## 遅延・容量・未検証事項

数値SLAは確認できない。公式のDecisions「Responses比約10倍高速」はサービスの一般説明であり、本製品の応答時間保証ではない。仮の評価目標は、発話終了から短い応答の最初の可聴音までp50<0.8秒/p95<1.5秒、backendを経た有用な次の質問までp95<4秒。対象端末・回線・日本語・同時接続数を記録して検証する。未達なら質問間の待機表示と文字経路を用意する。

Liveモデル公開表の同時接続枠はFree非対応、Build 50、Launch 300、Grow 500。実project上限は未確認。Agents/DecisionsのRPM/TPM・利用tierはproject依存のため具体値を確約しない。テナント別同時接続・token・時間上限、429の待機、課金の警告をアプリで実装する。推奨初期時間30分・pause後30秒でclose・最大再試行3回は製品提案でありOpenAI制限ではない。

実装前に確認するもの：実projectのLive/Responsesと任意採用するAgents/Decisionsの利用権限、region、上限、長時間接続、ブラウザー別音声、sideband attachの失敗復旧、同時接続と日本語訂正の精度。プロバイダー非対応時に別モデルへ無断変更せず、文字/人による対応へ切り替える。

## 推奨設計・cache・廃止予定の追加確認

実装判断の対応表は[公式照合](10-openai-guidance-review.md)。Live promptを公式の委譲記法へ修正し、単発Responsesのstrict出力例を追加した。APIが存在することと、この製品で必須であることを区別する。

Sol Standardのcache区分は、100万tokenあたりread $0.10、30m write $2.50、12h write $5.00。writeは通常入力$2へ上乗せするのではなく置換する。総入力を通常/read/30m write/12h writeへ排他的に分け、providerが内訳を返さなければ正確な原価を未確認とする。元の$1.668は全入力を通常入力とした限定例であり、既定cacheの実請求予測ではない。[Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)の保持・課金条件を参照する。

旧Evalsは2026-10-31からread-only、11-30にdashboard/API終了予定。prompt objectsとAgent Builderにも11-30終了予定があるため、新規の依存を設けない。[Deprecations](https://developers.openai.com/api/docs/deprecations)を公開前に再確認する。

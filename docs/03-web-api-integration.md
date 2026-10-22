# Web担当者向け接続契約

新提案 v0.2。正確なフィールドとレスポンスは[OpenAPI](../contracts/openapi.json)を正とし、SSEは[イベントスキーマ](../contracts/events.schema.json)に従う。以下のパスはすべてアプリ独自APIであり、OpenAIのAPIパスではない。

## 共通ルール

- 同一originの`/api/v1`。HttpOnly/Secure/SameSite=Laxの`haas_session` Cookie。更新系はOrigin検証と`X-CSRF-Token`を必須とする。招待交換と担当者の初回認証交換は事前Cookie・CSRF不要だが、Origin・レート制限を検証する。招待URLのtokenはfragmentで受け取り、交換後にURLから除去する。
- 企業側認証はSupabase Auth等の検証済みセッションをBFFのCookieへ交換する想定。ログイン方式の最終決定はWeb担当。OpenAIの認証とは別物。IDからテナントを推測・自己指定させない。
- すべてのPOSTは`Idempotency-Key`を必須とする。principal＋HTTP method＋route＋keyで24時間保持（初期提案）。同一payloadなら同一結果、異なるpayloadなら409。秘密の招待token・SDPはログに残さず、再送に必要な応答は暗号化・短期保持する。
- 面談の更新は原則`expected_revision`で競合検出。例外は同意撤回（revisionを要求しない）、pause/cancel/request_human（古いrevisionだけを理由に拒否しない）。停止を字幕更新との競合で妨げない。認証・認可・CSRFは例外なく検証する。409には権限内の現在revisionを返し、機械的な上書きをしない。企業・候補者を跨ぐ存在確認には404を返し、revisionも漏らさない。
- 429は`Retry-After`、503は再試行可能性を返す。指数backoff＋jitterは上限3回を提案。候補者入力を消さない。401は再認証、422は入力修正。エラーに本文・音声・キーを含めない。
- 日時はUTC RFC3339、表示は利用者のlocale。IDは不透明文字列。本文上限・レート上限はサーバーで検証する。

## 操作一覧

| 操作 | パス（/api/v1以下） | 許可・完了の意味 |
|---|---|---|
| 担当者認証の交換 | POST /auth/exchange | 検証済みidentity-provider JWTと有効なmembershipからCookie発行。初回CSRF不要、Origin検証必須 |
| セッション再取得 | GET /session | Cookie主体とCSRF tokenを返す。no-store、cross-originでの取得を許可しない |
| ログアウト | POST /auth/logout | セッションを失効しCookieとSSEを閉じる。候補者セッションが所有する音声もpause/close |
| 求人・質問の一覧/取得 | GET /template-versions、GET /template-versions/{template_version_id} | 企業内のテンプレートを取得。cursor/limitでページング |
| 面談一覧 | GET /interviews | 許可された範囲に絞ってからページング。未割当の本文は返さない |
| テンプレート版作成 | POST /template-versions | 担当者／管理者。職務説明と質問を不変版として保存 |
| 面談・招待作成 | POST /interviews | 担当者。作成者への担当割当も同じトランザクションで保存。招待tokenは一度だけ返す。送信自体は別の明示操作 |
| 招待交換 | POST /invites/exchange | token保持者。期限・一回使用を検証し面談限定Cookie発行 |
| スナップショット | GET /interviews/{interview_id} | 本人／割当担当者。最新版、同意文書、字幕、状態を返す |
| 同意記録 | POST /interviews/{interview_id}/consents | 本人。表示済みのpolicy_version/hashと必須項目を検証 |
| 音声接続 | POST /interviews/{interview_id}/voice-sessions | 本人。同意と状態を検証しoffer→answerを交換 |
| イベント再生 | GET /interviews/{interview_id}/events | 本人／割当担当者。SSE、Last-Event-IDで復旧 |
| 文字回答 | POST /interviews/{interview_id}/answers | 本人。音声を使えない場合の同等の回答経路 |
| 制御 | POST /interviews/{interview_id}/commands | pause / resume / request_finish / cancel / request_human |
| 訂正 | POST /interviews/{interview_id}/corrections | 本人。対象発話のrevisionと置換内容を確認して更新 |
| 終了時の欠落確認 | POST /interviews/{interview_id}/finalization-reviews | 割当担当者。音声終了未確認の場合の欠落と補完を最新transcriptに紐付けて確認 |
| 最終確認 | POST /interviews/{interview_id}/finish | 本人。最新の文字記録を確認して下書きジョブを登録、202 |
| レポート取得 | GET /interviews/{interview_id}/report | 本人／割当担当者。未完成202、完成200。内部reviewメモは別管理 |
| 人による確認 | POST /interviews/{interview_id}/reviews | 割当担当者。最新のreport_versionを根拠付きで確認 |
| 同意撤回 | POST /interviews/{interview_id}/consent-withdrawal | 本人。即時停止・以後の処理禁止。削除要求を同時に選択可能 |
| 削除要求・状態 | POST /interviews/{interview_id}/deletion-requests、GET /deletion-requests/{request_id} | 本人／権限を持つ管理者。処理進捗を返す。完了は非同期 |

`request_human`はアプリ内の担当者確認待ちフラグを立てる。Slack・メール・電話を自動送信しない。担当者が見る一覧は業務UI側で別途実装する。

## WebRTCの具体的な接続

1. 同意成功後、`getUserMedia({audio:true})`で権限を要求。エラー時は文字回答の画面へ進める。
2. `RTCPeerConnection`と音声trackを作り、track.enabled=falseにする。DataChannelを作る。offer作成→setLocalDescription→ICE gathering完了まで待つ。
3. `/voice-sessions`に`{expected_revision, offer_sdp}`を送る。ボタン連打で同一処理を増やさない。候補者の接続所有者はサーバーで確認する。
4. NodeはOpenAI LiveへSDPを送り、返されたprovider IDを保存しsidebandを接続する。購読不能なら接続を閉じ失敗応答にする。answer返却前の課金があり得るため、操作IDと開始時刻を記録する。
5. Webは`answer_sdp`をremote descriptionへ設定する。`session.start`は送信しない。`voice.ready`をSSEで受け、相手音声の再生準備を確認してtrackを有効にする。
6. DataChannelのclient送信はサーバー設定で全面禁止。serverイベントはstarted/closed/errorのみを許可し、字幕・状態はSSEを使用する。候補者が開発者ツールでプロンプトやツールを変更できない構成にする。
7. 中断はローカルtrackを即時無効にし`pause`を送信する。後から失敗応答が来ても自動でマイクを再開しない。再開操作は新しいofferと新しい冪等キーを作る。

ブラウザー更新後に古いSDP answerを再利用しない。同じ面談に同時に2本のactive音声接続を認めず、409 `VOICE_ALREADY_ACTIVE`を返す。接続作成がタイムアウトした場合はsnapshotの`active_connection_id`を照合する。上流作成結果が不明なまま無制限に再作成しない。

## SSEと順序

```
id: 42
event: transcript.updated
data: {"schema_version":"1.0","seq":42,"interview_id":"iv_demo","occurred_at":"2026-10-22T03:00:05Z","revision":5,"transcript_version":2,"generation":2,"type":"transcript.updated","data":{"utterance_id":"ut_1","utterance_revision":2,"speaker":"candidate","text":"担当した期間は3年です。","status":"corrected","question_id":"q_experience","source":"text","connection_id":null,"start_ms":null,"end_ms":null}}

```

SSEの`id`とJSONの`seq`は一致する。クライアントは最後に適用したseqを保存し、重複を捨てる。15秒heartbeat（コメント行）を提案。Cookieで接続し、トークンをqueryに載せない。再接続時は`Last-Event-ID`、ページ再読込時は同等の`after_seq`を使う。古すぎるcursorは410 `REPLAY_EXPIRED`、snapshotを再取得してその`last_seq`から接続する。

`transcript.fragment`は未確定字幕、`transcript.updated`はアプリがまとめた発話。いずれもAIが正確性を保証した意味ではない。イベントはDB保存後に発行する。Nodeから切断した場合、プロバイダーイベントの完全再取得を前提にせず`gap_detected`を保存する。イベント履歴は本文の保持期限に従って削除する。

## 終了・訂正・人の確認の契約

`request_finish`で入力を止め、Liveを閉じ、状態を`awaiting_confirmation`にする。音声のない文字面談ではcloseは不要。音声のfinalizationが未確認なら`finish`は409 `FINALIZATION_UNCONFIRMED`。担当者が欠落を調べ、候補者の文字での補完などを確認して`finalization-reviews`へnoteと最新transcript_versionを送る。これにより`finalization_review_id`が設定され、当該バージョンに限って本人のfinishを許可する。providerの`finalization_confirmed`をtrueへ偽装せず、レポートには欠落と人の確認を明記する。文字記録が変わればこのreviewも失効する。単にUIタイマーが切れたことを完了にしない。

`finish`は`confirmed_transcript_version`が最新、同意が有効、接続が閉じ、終了確認または上記の人による欠落確認が有効な場合のみ202。発話ゼロの場合はバージョン0を確認でき、全項目unconfirmedで下書きを作る。文字面談のみならprovider終了確認は不要。再接続の最後が正常に閉じても、古い接続の未確認gapは消えない。`gaps`がある場合は`finalization_review_transcript_version`が最新と一致する人の確認が必要。未回答項目を作り話で埋めず、質問への回答を強制するために終了を拒否しない。cancelは確認待ちでも常に選べる。

訂正は相手側の発話や別候補者の発話には適用できない。引用の誤りを指摘する場合は問い合わせとして扱う。下書き生成中・確認後の訂正も受理し、旧レポートと旧reviewをstaleにする。最新記録を再確認して再生成する。クライアントが古いreport_versionをreviewしようとしたら409。

reviewの`acknowledge`は「記録の根拠を人が確認した」であり「採用」ではない。`request_changes`は担当者メモを残し、候補者の原発話を担当者が書き換える操作ではない。必須チェック`evidence_checked`と`corrections_checked`は明示操作でtrueにする。

snapshotは`template`（職務と不変の質問版）、`current_question_id`、`gaps`を含む。画面が質問を推測して作らない。未取得の質問をブラウザーのAIやハードコードで補わない。

冪等応答を返す前にも現在の認証・割当・失効・取消を検証する。撤回前の成功応答を再送して処理が生きているように見せない。招待交換前はprincipalがないためtokenのhashとOriginにscopeを固定し、交換後の再送は同じ発行セッションに紐付ける。ログアウト後の再送でCookieを復活させない。応答を失った場合の再招待は新tokenで行う。

同意撤回後は担当者のsnapshot/report取得を403にし、既存SSEも閉じる。候補者本人の記録取得と削除進捗は、データが削除されるまで本人scopeで許可する。企業管理者には削除運用権限だけを残し、内容閲覧権限を自動付与しない。

同意hashは`policy_hash`自身を除くConsentDocumentのUTF-8 JSON（キー昇順・空白なし・Unicodeをそのまま出力）のSHA-256とする。クライアントは再計算せず、表示したサーバー版のhashを返す。文書変更はversion/hashを更新し、古い同意を使い回さない。

## バックエンド内部契約

Nodeは面談ID・接続ID・generationを固定したサービス資格で業務APIにイベントを書き込む。公開OpenAPIには内部書き込み口を露出しない。内部受信は`provider_event_id`、type、timestamps、payloadを受け、認可済み接続レコードと照合してraw保存→正規化→outboxを一度だけcommitする。

Agentsへ公開する関数は`get_interview_context`（当該面談の許可済み情報のみ）と`propose_next_step`（質問ID・確認内容の提案）の2つ。引数から任意tenant、URL、SQLを指定できない。関数の実行権限はモデル出力から得ず、呼出元sessionに固定する。`propose_next_step`はDBの採否・状態を直接更新しない。

AI担当からWeb担当への納品単位：この契約、provider adapterの状態通知、プロンプトバージョン、fixture。Web担当からAI担当への納品単位：認可済み面談context、保存/訂正/同意API、永続イベント、ジョブ完了callback。実名の担当者とレビュー日程は別途確認する。

## 画面プロトタイプへの接続対応

2026-10-22の追加確認で、`feat/haas-screen-prototype`のcommit `6f685ada68a71ec7993dbd1b53fd6b5d467235d5`を確認した。白・青のデザインと画面遷移が追加され、API・業務型の接続境界は前回確認時から同じ。画面遷移と未接続表示を再利用し、次の順で接続する。今回は同ブランチのコードは変更していない。

| 現在の画面・実装先 | 接続するもの | 変更が必要な境界 |
|---|---|---|
| `/login` | POST /auth/exchange、GET /session | ログイン済み表示は実際の認証・membership確認後 |
| `/jobs/demo` | POST /template-versions | 求人記述と質問を不変版にする。demo固定IDを本番IDへ変える |
| `/interviews/invite` | POST /interviews | tokenの生成・期限・一回交換。生成だけで送信済みと表示しない |
| `/candidate/demo`・`/check` | 招待交換、snapshot、POST /consents | 現状のローカルcheckboxを正式な同意の代わりにしない |
| `/candidate/demo/conversation` | voice-sessions、SSE、answers、commands、corrections | 実際のマイク・字幕・再接続・訂正。終了確認画面を追加 |
| `/candidate/demo/complete` | finishの202とreport status | 画面遷移だけで面談完了扱いにしない |
| `/interviews/sample-*/report` | GET /report、POST /reviews | fixture置換、発話根拠・訂正revision・未確認の表示 |
| `apps/api` | `/api/v1`の各認可済みroute | 現在は全API 503。認証完成前に無条件の成功応答へ変更しない |
| `apps/voice` | Live/Agents/Decisions adapter | 現在は実サービスなし。サーバーキーとsidebandを実装 |
| `packages/contracts` | OpenAPIからの型・ZodとSSE/report schema | 現在の503エラーはcode/messageのみ。request_id/retryable/current_revisionの追加をWebと同時に移行 |
| `packages/domain` | 本設計の詳細stateとrevision | 現在のinvited/in_progress/review_pendingは表示用に残せるが、業務の正本には不足 |

表示互換の暫定マッピングは、`invited`→awaiting_consent/ready、`in_progress`→connecting/active/paused/awaiting_confirmation/finalizing、`review_pending`→review_pending。reviewed/cancelled/failedは別ラベルを追加する。一括で逆変換して状態を更新しない。

既存の`Permissions-Policy`はmicrophoneを拒否し、CSP connect-srcはselfのみ。接続する候補者画面に限ってマイクと実際に必要なOpenAI/WebRTC先を許可する変更が必要。認証・同意・Origin検証と一緒にレビューし、全サイトを無制限に許可しない。プロトタイプのREADMEにある24系Nodeの固定バージョンとlockfileを継続し、本設計のために既存future-companyの古いruntime設定へ戻さない。

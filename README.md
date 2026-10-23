# HaaS 採用対話アプリ

React / TypeScriptの画面遷移プロトタイプです。企業の求人設定・招待・記録確認と、各社の採用サイトへの設置例と、候補者の職種選択・ダミー回答・要約確認・訂正・補足・提出前確認までを確認できます。すべて架空のサンプルで、ログイン、保存、招待発行、音声、AI、DB接続は行いません。

## 開発

Node.js **24.22.1**（2026年10月のセキュリティ更新を含む24系LTS）と npm **11.19.1** を使用します。

```sh
nvm install
nvm use
npm ci
npm run dev
```

http://localhost:5173 を開きます。認証情報や `.env` は不要です。API操作には「現在利用できません」と表示し、成功扱いにしません。

### HTMLファイルを直接開いて確認する場合

`apps/web/index.html` はViteの開発用入口です。ファイルを直接プレビューする場合は次の専用ビルドを使ってください。

```sh
npm run build:preview
```

リポジトリ直下に生成される `preview.html` を開きます。JavaScript・CSS・アイコンを一つにまとめているため、サーバーやネット接続なしで画面遷移できます。プレビューでは `#/jobs` のようなハッシュ付きURLを使います。通常のWeb版のURLと配信時のセキュリティヘッダーは変わりません。

| コマンド            | 内容                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | React開発サーバー。loopbackのみで待受                             |
| `npm run dev:api`   | Hono / WorkersのローカルAPIとビルド済み画面。先に `npm run build` |
| `npm run build`     | Reactの本番ビルド                                                 |
| `npm run preview`   | ビルド済み画面を確認                                              |
| `npm run typecheck` | 全ワークスペースの型検査                                          |
| `npm run test:unit` | APIの503応答とセキュリティヘッダーを検査                          |
| `npm run test:e2e`  | 実ブラウザで画面遷移と未接続表示を検査                            |
| `npm run audit`     | 開発依存を含む既知の脆弱性を検査                                  |

E2Eの初回実行前に `npx playwright install chromium` を実行してください。既存Chromiumは `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` で使用できます。

## 構造

```text
apps/web/             React・画面・架空サンプル
apps/api/             Hono・未提供APIへの503応答・配信設定
apps/voice/           音声処理の将来の実装先（未接続）
packages/contracts/   API応答のZodスキーマ
packages/domain/      面談状態などの業務型
packages/database/    将来のDB定義・RLSの実装先（未接続）
tests/                APIとブラウザの検証
docs/                 画面一覧とセキュリティ上の実装境界
```

画面一覧は [画面遷移](docs/navigation.md)、暗号化通信・認証の実装境界は [セキュリティ](docs/security.md) を参照してください。元資料は [HaaSの構成案](https://chatgpt.com/space/page_f073c7c45d90819197148460c40342d8) です。

## 各社の採用サイトから利用する

企業のナビゲーション「サイトへの設置」から、ボタン／カードのHTML例と候補者の入口を確認できます。設置例 `/careers/sample` → 企業別案内 `/apply/sample-open` → ダミー受検 `/candidate/demo` → 要約 → 提出前確認と進みます。2社目の例は `/careers/sora` です。公開案内リンクと本人専用の招待を分け、提出結果は企業の管理画面で確認する構成です。

設置用HTMLの `.example` ドメインは説明用で、未公開です。招待発行・企業への提出は未接続表示とし、送信成功を装いません。構成と本番で必要な分離は [提供形態と構成案](docs/architecture.md) を参照してください。

## 候補者のダミー対話

候補者の画面から職種とやってみたいことを選び、4つの質問で「ダミー回答を入力」、または「文字起こしデモを開始」で逐次表示を試せます。文字起こしは停止・再開・確認後に回答欄へ反映し、要約の確認へ進めます。要約から質問をやり直したり、補足を追加したりできます。ダミー回答には用意した要点を表示し、編集した回答と補足はその文章をそのまま反映します。AIへの送信・録音はありません。入力は画面内だけの一時状態で、再読み込みすると消えます。詳細は [候補者のダミー対話](docs/candidate-demo.md) を参照してください。

## デザイン

画面の配色と形状の参照元は [デザイン](docs/design.md) に記載しています。

## セキュリティ更新

Nodeの最低バージョンを `engines` と実行時チェックで制限し、`.nvmrc`・`.node-version`・CIを揃えています。依存は正確なバージョンとlockfileで固定します。CIで型検査・テスト・ビルド・`npm audit` を行い、Dependabotで更新PRを受け取ります。

固定バージョンは永続的な安全性の保証ではありません。[Node公式セキュリティ告知](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)と依存更新を確認し、Nodeを更新する際は両バージョンファイル・`engines`・CI・lockfileを合わせて更新してください。

音声のリアルタイム認識、カメラ、AIによる代行への対策案は [文字起こしと本人による回答の確認](docs/interview-integrity.md) を参照してください。現在の文字起こしは架空テキストのUIデモです。

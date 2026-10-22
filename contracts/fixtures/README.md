# 架空の接続データ

全データは架空です。token/CSRF/SDPの文字列は実際に接続できる資格情報ではありません。`voice-answer.json`はUIモック用で、WebRTC動作試験には使えません。

`manifest.json`がOpenAPIのcomponent schemaとの対応表です。`events.json`は[events.schema.json](../events.schema.json)、`report.json`は[report.schema.json](../report.schema.json)に従います。

訂正のシナリオ：revision 4 / transcript 1の「5年」を本人が「3年」へ訂正し、revision 5 / transcript 2 / generation 2になる。終了要求で音声を閉じrevision 6、本人の最終確認でrevision 7、下書き保存でrevision 8になり、人が確認する。引用はut_1のrevision 2を参照する。q_roleは未確認のまま残す。

開始用のtemplate、招待、同意、session、音声answerと、途中の訂正、終了、下書き、review、競合、削除進捗を含みます。レスポンスを順に表示できることは、認可や実音声の動作証明にはなりません。

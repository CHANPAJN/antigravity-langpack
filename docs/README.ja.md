<div align="center">

# antigravity-langpack — Google Antigravity 2.0 日本語化・多言語パック

**`app.asar` 非改変（macOS の公式署名を維持）・バイナリ（`.exe`）ゼロの Google Antigravity 2.0 / Insiders 対応ネイティブ UI 日本語化＆多言語切り替えツール（VS Code 日本語言語パックが効かない新エージェント UI に完全対応・全14ロケール収録）。**

<p>
  <a href="../README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./README.zh-TW.md">繁體中文</a> ·
  <b>日本語</b> ·
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="./demo.gif" width="840" alt="antigravity-langpack Native Display Language Switcher Demo" />
</p>

</div>

---

## 従来の日本語化パッチ（`app.asar` 書き換え方式）との違い

1. **macOS の Gatekeeper・キーチェーンに完全対応（`app.asar` 非改変）**：
   `/Applications/Antigravity.app` 本体のファイルを一切書き換えません。Google 公式の Apple 公証署名がそのまま維持されるため、**「アプリが壊れているため開けません」警告やキーチェーンのパスワード要求が発生しません**。
2. **通常の自動アップデート後も再パッチ不要**：
   `Antigravity`（Stable）および `Antigravity - Insiders` の通常のアップデートに追従し、毎回手動でパッチを当て直す手間がありません。
3. **「設定 → 外観」から再起動なしで即時言語切り替え**：
   公式 UI と同じデザインの **「表示言語 (Display Language)」** ドロップダウンを `設定 → 外観` に組み込みます。ワンクリックで **日本語（1,920語収録・VS Code 日本語版準拠の自然なカタカナ用語）** と英語（Original English）や全14ロケールをその場で切り替えられます。
4. **バイナリ（`.exe`）ゼロ・外部 npm 依存ゼロ・管理者権限（`sudo`）不要**：
   すべて監査可能なプレーンテキストの JavaScript（Node.js >= 22.13 標準 API のみ）で構成されています。コードエディタ・ターミナル・チャット本文は一切改変しません。
5. **オンデマンドの読み取り専用 AI 差分翻訳（デフォルト無効）**：
   1,920語の完全辞書を標準同梱しているため、バックグラウンドでの未翻訳テキスト収集や自動 AI 呼び出しは**デフォルトでオフ**になっています。新バージョンで未翻訳ラベルが追加された場合は、手動で `node cli.mjs sync-ai` を実行することで読み取り専用サンドボックス経由で `dict/learned.ja.json` を補完できます。

---

## クイックスタート（macOS / Windows / Linux）

### 方法 A：AI エージェントに1行貼るだけで自動導入（おすすめ）

Antigravity や Claude Code のチャット欄に以下の1行を貼り付けるだけで自動セットアップされます（詳細：[AI_INSTALL.md](../AI_INSTALL.md)）：

```text
https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md を読んで、Antigravity を日本語化（ja）してください。
```

### 方法 B：コマンドで手動インストール

公式 **Node.js >= 22.13.0** が必要です（管理者権限や `sudo` は不要です）。

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 日本語を初期言語としてインストール
node cli.mjs install --lang ja

# macOS オプション：起動時からデバッグポートを付与する純シェルスクリプト製 Dock ランチャーを作成
node cli.mjs install --lang ja --mac-launcher

# オプション：アップデート時の新規英語ラベル自動差分翻訳を有効化（後から `node cli.mjs auto-sync on/off` でも切替可能）
node cli.mjs install --lang ja --auto-sync

# オプション：チャット内同期スキル（~/.gemini/config/skills/）を明示的に追加する場合
node cli.mjs install --lang ja --with-skill
```

- **アプリ内での切り替え**：`設定 (Settings) → 外観 (Appearance) → 表示言語` からいつでも変更可能。
- **アンインストール（公式英語 UI に即時復元）**：`node cli.mjs uninstall`

---

## 動作の仕組みと透明性について

- **起動時のデバッグポート自動付与（`autoRelaunchCdp: true`）**：`--remote-debugging-port=0` なしで起動された場合、デーモンは**起動直後（15秒未満）かつ直近の会話書き込みがない新規プロセスに限り**、通常の終了要求（`CloseMainWindow` / `SIGTERM` のみを使用し、強制終了 `-Force` / `SIGKILL` は一切行いません。未保存確認等で閉じない場合は即座に対象外として保護します）を送ってポート付きで1回だけ再起動します。`dict/config.json` で `"autoRelaunchCdp": false` に変更すると無効化できます。
- **セレクタの適用範囲とプライバシー**：接続済みウィンドウは CDP WebSocket イベント駆動（＋4秒間隔のローカルポート確認）で動作します。将来クライアント側の大型アップデートで設定画面の DOM 構造自体が大きく刷新された場合は、`src/injector.js` のセレクタ更新が必要になります。また、デフォルトでは `~/.gemini/config/skills/` への書き込みやバックグラウンド収集は一切行いません。

---

## ライセンス

OSI 承認オープンソースライセンスである [GNU General Public License v3.0 (GPL-3.0)](../LICENSE) の下で公開されています。

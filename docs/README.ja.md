<div align="center">

# antigravity-langpack — Google Antigravity 2.0 日本語化・多言語パック

**`app.asar` 非改変（macOS の公式署名を維持）・毎日の自動アップデートでも消えない・バイナリ（`.exe`）ゼロの Google Antigravity / Insiders 対応ネイティブ UI 日本語化＆14言語切り替えツール。**

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
2. **毎日の自動アップデート後も再パッチ不要**：
   `Antigravity`（Stable）および毎日更新される `Antigravity - Insiders` の両方に自動追従します。アップデート後に日本語が消えてスクリプトを再実行する手間がありません。
3. **「設定 → 外観」から 30ms で即時言語切り替え（再起動不要）**：
   公式 UI と同じデザインの **「表示言語 (Display Language)」** ドロップダウンを `設定 → 外観` に組み込みます。ワンクリックで **日本語（1,920語収録・VS Code 日本語版準拠の自然なカタカナ用語）** と英語（Original English）や他13言語を瞬時に切り替えられます。
4. **不審なバイナリ（`.exe`）ゼロ・外部 npm 依存ゼロ・管理者権限（`sudo`）不要**：
   すべて監査可能なプレーンテキストの JavaScript（Node.js >= 22.13 標準 API のみ）で構成されています。コードエディタ・ターミナル・チャット本文は一切改変しません。
5. **API キー不要の AI 自動差分翻訳**：
   アップデートで新しい英語ボタンが追加された場合も、ローカルの Antigravity を通じて `dict/learned.ja.json` へ自動補完できます。

---

## クイックスタート（macOS / Windows / Linux）

公式 **Node.js >= 22.13.0** が必要です（管理者権限や `sudo` は不要です）。

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 日本語を初期言語としてインストール
node cli.mjs install --lang ja

# macOS オプション：Dock から直接起動できる純シェルスクリプト製ランチャーを作成する場合
node cli.mjs install --lang ja --mac-launcher
```

- **アプリ内での切り替え**：`設定 (Settings) → 外観 (Appearance) → 表示言語` からいつでも変更可能。
- **アンインストール（公式英語 UI に即時復元）**：`node cli.mjs uninstall`

---

## ライセンス

[PolyForm Noncommercial License 1.0.0](../LICENSE) の下で公開されています。個人の開発利用およびソースコード監査は完全無料です（商用転売・クレジット削除による再配布は禁止されています）。

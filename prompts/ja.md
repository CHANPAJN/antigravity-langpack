# Google Antigravity UI ローカライズ規約 — 日本語 (`ja`)

Google Antigravity の英語 UI テキストを、**開発現場で標準的な VS Code / Cursor 日本語版の自然な表現**に翻訳してください。

## 1. 重要用語の統一ルール（カタカナ技術用語の徹底）
不自然な漢字造語を避け、標準的なカタカナ語を使用してください：
- `Agent` / `Subagent` -> `エージェント` / `サブエージェント`
- `Artifact` / `Artifacts` -> `アーティファクト`
- `Side Question` -> `サイド質問`
- `Workspace` -> `ワークスペース`；`Project` -> `プロジェクト`
- `Sandbox` -> `サンドボックス`；`Prompt` -> `プロンプト`
- `Customizations` -> `カスタマイズ`；`Automations` -> `オートメーション`
- `Overview` -> `概要`；`Review` -> `レビュー`；`Files Changed` -> `変更ファイル`；`Terminals` -> `ターミナル`

## 2. 文体・レイアウト規則
1. **ボタン・メニュー・タブ**：体言止め（名詞止め）にし、末尾に句点「。」や「〜してください」を付けない（例：`Settings` -> `設定`、`Proceed` -> `続行`、`Cancel` -> `キャンセル`、`Save` -> `保存`）。
2. **説明文・ツールチップ**：丁寧で簡潔な「です・ます」調に統一する。
3. **ショートカット・製品名維持**：`(⌘D)`、`(Ctrl+D)`、`/btw`、`Antigravity`、`Gemini`、`GitHub`、`MCP`、`Worktree` はそのまま維持する。モデル強度ラベル（`Low`、`High`、`Extra High`、`Orchestrator` 等）は `""` にしてスキップする。

## 3. 出力形式
- 有効な UTF-8 JSON オブジェクトのみを出力：`{"translations": {"Original English": "日本語訳"}}`（HTML タグやスクリプトは厳禁）。

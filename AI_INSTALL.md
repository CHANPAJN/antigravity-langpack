# One-Prompt AI Setup Guide (`antigravity-langpack`)

This guide allows any AI coding agent (**Google Antigravity, Claude Code, Codex, OpenCode, or Cursor**) to install and activate `antigravity-langpack` automatically in one turn.

---

## Copy & Paste Prompt for Users

- **English:**
  `Read https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md and install antigravity-langpack for my language.`
- **日本語 (Japanese):**
  `https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md を読んで、Antigravity を日本語化（ja）してください。`
- **한국어 (Korean):**
  `https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md 문서를 읽고 Antigravity 한국어 패치(ko)를 설치해 줘.`
- **Русский (Russian):**
  `Прочитай https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md и установи русификатор Antigravity (ru).`
- **简体中文 (Simplified Chinese):**
  `请阅读 https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md 并帮我安装激活 Antigravity 简体中文语言包（zh-CN）。`
- **繁體中文 (Traditional Chinese):**
  `請閱讀 https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md 並幫我安裝啟用 Antigravity 繁體中文語言包（zh-TW）。`
- **Tiếng Việt (Vietnamese):**
  `Hãy đọc https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md và cài đặt gói giao diện Tiếng Việt (vi) cho Antigravity.`

---

## Agent Execution Steps

1. **One-Line Auto-Bootstrap (Auto-fetches verified portable Node.js if system Node >= 22.13 is absent):**
   - **macOS / Linux:**
     ```bash
     curl -fsSL https://raw.githubusercontent.com/CHANPAJN/antigravity-langpack/main/install.sh | sh -s -- --lang <locale>
     ```
   - **Windows PowerShell:**
     ```powershell
     $env:AGY_LANG='<locale>'; irm https://raw.githubusercontent.com/CHANPAJN/antigravity-langpack/main/install.ps1 | iex
     ```
2. **Or Manual Clone & Install (When Node.js >= 22.13 is already in PATH):**
   Clone `https://github.com/CHANPAJN/antigravity-langpack.git` into `~/.antigravity-langpack` (or `%USERPROFILE%\.antigravity-langpack` on Windows), then run:
   ```bash
   node cli.mjs check
   node cli.mjs install --lang <locale>
   ```
   Supported `<locale>` codes (15 packs, 2,125 entries each — covers Stable, Insiders & Antigravity IDE): `ja`, `ko`, `ru`, `zh-CN`, `zh-SG`, `zh-TW`, `vi`, `es`, `fr`, `de`, `pt`, `it`, `th`, `id`, `hi`.
   - On **macOS**, if the user launches Antigravity or Antigravity IDE from the Dock, offer `--mac-launcher` (`node cli.mjs install --lang <locale> --mac-launcher`) so `--remote-debugging-port=0` is passed cleanly without touching `/Applications/Antigravity.app` or Apple code signatures.
   - Do **not** pass `--auto-sync` or `--with-skill` unless the user explicitly asks for them.
3. **Verify Status & Report:**
   Run `node cli.mjs status` and tell the user they can switch among all 15 locales and original English anytime via **`Settings → Appearance → Display Language`** (or `node cli.mjs uninstall` to restore original English).

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
- **简体中文 (Simplified Chinese):**
  `请阅读 https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md 并帮我安装激活 Antigravity 简体中文语言包（zh-CN）。`
- **Tiếng Việt (Vietnamese):**
  `Hãy đọc https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md và cài đặt gói giao diện Tiếng Việt (vi) cho Antigravity.`

---

## Agent Execution Steps

1. **Check Node.js Version:**
   Verify `node -v` is `>= 22.13.0`.
2. **Clone Repository to User Tools Directory:**
   Clone `https://github.com/CHANPAJN/antigravity-langpack.git` into a clean user-level folder (for example `~/antigravity-langpack` on macOS/Linux or `%USERPROFILE%\antigravity-langpack` on Windows).
3. **Select Locale Code Matching User's Request:**
   Supported codes: `ja` (Japanese), `ko` (Korean), `zh-CN` (Simplified Chinese), `zh-SG` (Chinese + English tech terms), `zh-TW` (Traditional Chinese), `vi` (Vietnamese), `es` (Spanish), `fr` (French), `de` (German), `pt` (Portuguese), `it` (Italian), `th` (Thai), `id` (Indonesian), `hi` (Hindi).
4. **Run Non-Destructive User-Level Install:**
   ```bash
   node cli.mjs check
   node cli.mjs install --lang <locale>
   ```
   - On **macOS**, if the user launches Antigravity from the Dock, offer `--mac-launcher` (`node cli.mjs install --lang <locale> --mac-launcher`) so `--remote-debugging-port=0` is passed cleanly without touching `/Applications/Antigravity.app` or Apple code signatures.
   - Do **not** pass `--auto-sync` or `--with-skill` unless the user explicitly asks for them.
5. **Verify Status & Report:**
   Run `node cli.mjs status` and tell the user they can switch languages anytime via **`Settings → Appearance → Display Language`** (or `node cli.mjs uninstall` to restore original English).

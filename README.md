<div align="center">

# antigravity-langpack

Plain-text native UI localization pack for Google Antigravity (`Stable` & `Insiders`) on macOS, Windows, and Linux.  
Mounts via local CDP event streams with zero `app.asar` modification, intact macOS Apple notarization, and 15 offline locale packs (2,065 entries each).

<sub>Google Antigravity 2.0 日本語化 · 한글화 / 한국어 패치 · Русификатор · 中文汉化 · 繁體中文化 · Giao diện Tiếng Việt · Español · Français · Deutsch · Português · Italiano</sub>

<p>
  <b>English</b> ·
  <a href="./docs/README.zh-CN.md">简体中文</a> ·
  <a href="./docs/README.zh-TW.md">繁體中文</a> ·
  <a href="./docs/README.ja.md">日本語</a> ·
  <a href="./docs/README.ko.md">한국어</a> ·
  <a href="./docs/README.ru.md">Русский</a>
</p>

<p>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="GPL-3.0 License" /></a>
  <a href="https://linux.do"><img src="https://img.shields.io/badge/Community-LINUX%20DO-1C1C1E?style=flat-square&logo=linux&logoColor=34D399" alt="LINUX DO Community" /></a>
</p>

<img src="./docs/demo.gif" width="840" alt="antigravity-langpack Appearance Switcher" />

</div>

## Visual Overview

<p align="center">
  <img src="./docs/assets/bento-zh-CN.png" width="880" alt="Workbench, Full Marketplace Localization & Native Appearance Controls" />
</p>

<p align="center">
  <img src="./docs/assets/locales-gallery.png" width="880" alt="15 Native Offline Locale Packs Preview" />
</p>

## Install

Requires zero admin or `sudo` privileges. If `Node.js >= 22.13` is not found in `PATH`, the installer automatically provisions an official `SHASUMS256.txt`-verified portable runtime inside `.runtime/` while keeping zero binaries in the repository.

**macOS & Linux**

```bash
# Default (zh-CN), or pass --lang ja / ko / ru / zh-TW / vi / es / fr / de / pt / it
curl -fsSL https://raw.githubusercontent.com/CHANPAJN/antigravity-langpack/main/install.sh | sh -s -- --lang ja
```

**Windows (PowerShell)**

```powershell
# Default (zh-CN), or prefix `$env:AGY_LANG='ja'; ` for another language
irm https://raw.githubusercontent.com/CHANPAJN/antigravity-langpack/main/install.ps1 | iex
```

**AI Agent Setup** ([AI_INSTALL.md](./AI_INSTALL.md))

```text
Read https://github.com/CHANPAJN/antigravity-langpack/blob/main/AI_INSTALL.md and install antigravity-langpack for my language (e.g. ja / ko / ru / zh-CN / vi / es / fr / de).
```

**Source Checkout**

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack
node cli.mjs install --lang ja
node cli.mjs install --lang ja --mac-launcher   # Optional: pure-shell macOS Dock launcher
```

## Usage & CLI

Open **`Settings → Appearance`** inside Antigravity to access two native controls:

- **Display Language**: Switch live across all 15 bundled locales and original `English (Default)` without restarting windows.
- **Sync AI Thinking & Reply Language**: Strictly `false` by default; when enabled, syncs a lightweight single-file output rule so agent reasoning, step summaries, and replies match your active UI language.

```bash
node cli.mjs status          # Inspect daemon PID, active locale, and connected ports
node cli.mjs lang            # List all 15 bundled locale packs (2,065 entries each)
node cli.mjs lang ru         # Switch UI locale immediately (`en` restores English)
node cli.mjs ai-lang on      # Opt-in: sync AI thinking & reply language (`off` to disable)
node cli.mjs sync-ai         # On-demand sandboxed translation for newly added upstream strings
node cli.mjs check           # Verify zero binaries and validate all scripts/JSON
node cli.mjs uninstall       # Remove autostart and restore original English UI immediately
```

## How It Works & Operational Transparency

- **Event-Driven Local CDP Stream**: Connects over `127.0.0.1` via a single persistent WebSocket (`Page.frameNavigated` & `Runtime.bindingCalled`, `~0.0%` idle CPU) plus `fs.watch` on `dict/`. Never touches `/Applications/Antigravity.app`, `Program Files`, or `app.asar`.
- **DOM Isolation & `WeakMap` Restoration**: Skips Monaco code editors, integrated terminals, code blocks, and chat messages. Original `TextNode` values are tracked in a `WeakMap` for instant in-memory switching and restoration.
- **Cold-Start Debug Port Relay (`autoRelaunchCdp: true`)**: On Windows, `install` appends `--remote-debugging-port=0` to user shortcuts. If launched bare without a debugging port, the daemon only intercepts newly started processes (`<15s` old, `<25s` after `--updated`) with no recent conversation writes, sends a graceful close (`CloseMainWindow` / `SIGTERM` — never force-kill), and relaunches once with `--remote-debugging-port=0`. Set `"autoRelaunchCdp": false` in `dict/config.json` to disable.
- **Strict Opt-In Defaults**: `collectUntranslated`, `autoSyncAi`, and `syncAiOutputLang` are all `false` by default, and `install` does not write to `~/.gemini/config/` unless explicitly requested (`--with-skill` or `--sync-ai-lang`).

## Bundled Locales (15 Packs × 2,065 Entries · Full Marketplace Catalog)

- **East & South/Southeast Asia**: `zh-CN` (简体中文) · `zh-SG` (简体中文 · English Tech Terms) · `zh-TW` (繁體中文) · `ja` (日本語) · `ko` (한국어) · `vi` (Tiếng Việt) · `th` (ภาษาไทย) · `id` (Bahasa Indonesia) · `hi` (हिन्दी)
- **Europe & Americas**: `ru` (Русский) · `es` (Español) · `fr` (Français) · `de` (Deutsch) · `pt` (Português) · `it` (Italiano)

## License

Released under the [GNU General Public License v3.0 (GPL-3.0)](./LICENSE). Community discussion & feedback: [LINUX DO](https://linux.do).

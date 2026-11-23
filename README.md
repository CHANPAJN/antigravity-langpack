<div align="center">

# antigravity-langpack

**Zero-binary, zero-ASAR-patch multi-language UI pack (13 languages / 14 locales) for Google Antigravity (`Antigravity` & `Antigravity - Insiders`) on macOS, Windows, and Linux.**

<p>
  <b>English</b> ·
  <a href="./docs/README.zh-CN.md">简体中文</a> ·
  <a href="./docs/README.zh-TW.md">繁體中文</a> ·
  <a href="./docs/README.ja.md">日本語</a> ·
  <a href="./docs/README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="./docs/demo.gif" width="840" alt="antigravity-langpack Native Display Language Switcher Demo" />
</p>

</div>

---

## Why `antigravity-langpack`?

Unlike `app.asar` binary patchers or compiled `.exe` wrappers, **`antigravity-langpack`** operates via local DevTools Protocol (CDP) runtime bindings using **100% auditable plain-text scripts**:

1. **Zero `app.asar` Modification (macOS Gatekeeper & Keychain Safe)**:
   Never modifies `/Applications/Antigravity.app` or `Program Files`. Preserves Google's official Apple notarization signature on macOS — **zero "App is damaged" alerts** and **zero repeated Keychain password prompts**.
2. **Survives Routine Client Auto-Updates Without Re-Patching**:
   Both `Antigravity` (Stable) and `Antigravity - Insiders` stay localized across routine updates (`--updated`) without re-running a patch script after every build.
3. **Native In-App Language Switcher (Instant Live Switch)**:
   Mounts a native **Display Language** dropdown directly inside **`Settings → Appearance`**. Switch between **13 languages (14 locales)** and original English in real time without restarting windows.
4. **100% Plain-Text, Zero Binaries, Zero Third-Party Dependencies, Zero Admin Needed**:
   Contains **zero `.exe` / `.dll` / `.node` files** and **zero `npm` dependencies**. Installs strictly under user-level directories (no `sudo` or Administrator privileges required).
5. **Opt-In Key-Free AI Incremental Sync**:
   All 14 locale packs ship complete out of the box (1,920 entries each). Background phrase collection and AI sync are **disabled by default**; when a future release adds new English UI labels, you can run `node cli.mjs sync-ai` on demand to translate only the missing strings into `dict/learned.<locale>.json` via a sandboxed read-only `agy` call.

---

## Pre-Bundled Locales (13 Languages · 14 Packs · 1,920 Entries Each)

| Code | Display Option | Convention & Highlights |
| :--- | :--- | :--- |
| `en` | **English (Default)** | Instant zero-restart switch back to original English UI |
| `zh-CN` | **简体中文** | **1,920 entries** — Modern Simplified Chinese terminology (`智能体 / 子智能体 / 生成产物 / 侧边追问`) |
| `zh-SG` | **简体中文 (英文术语)** | **1,920 entries** — Simplified Chinese variant keeping English technical terms (`Agent / Subagent / Artifact / Workspace`) |
| `zh-TW` | **繁體中文** | **1,920 entries** — Aligned with VS Code Traditional Chinese (`程式碼 / 檔案 / 專案 / 預設 / 快取`) |
| `ja` | **日本語 (Japanese)** | **1,920 entries** — Standard katakana developer terms (`エージェント / アーティファクト / サイド質問`) |
| `ko` | **한국어 (Korean)** | **1,920 entries** — Modern Korean developer UX (`에이전트 / 아티팩트 / 워크스페이스`) |
| `vi` | **Tiếng Việt (Vietnamese)** | **1,920 entries** — Clean Vietnamese UI keeping standard Git & AI terms |
| `hi` | **हिन्दी (Hindi)** | **1,920 entries** — Modern Devanagari developer UX |
| `id` | **Bahasa Indonesia (Indonesian)** | **1,920 entries** — Concise Indonesian software UI |
| `th` | **ภาษาไทย (Thai)** | **1,920 entries** — Layout-safe compact Thai developer UI |
| `es` | **Español (Spanish)** | **1,920 entries** — Aligned with VS Code Spanish (`Agente / Artefacto / Configuración`) |
| `fr` | **Français (French)** | **1,920 entries** — Aligned with VS Code French (`Sous-agent / Artefact / Paramètres`) |
| `de` | **Deutsch (German)** | **1,920 entries** — Aligned with VS Code German (`KI-Agent / Artefakt / Einstellungen`) |
| `pt` | **Português (Portuguese)** | **1,920 entries** — Aligned with VS Code Portuguese (`Agente / Artefato / Configurações`) |
| `it` | **Italiano (Italian)** | **1,920 entries** — Aligned with VS Code Italian (`Agente / Artefatto / Impostazioni`) |

---

## Quick Start (Zero Admin / Zero `sudo`)

Requires official **Node.js >= 22.13.0**.

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# Install (defaults to zh-CN, or pass --lang ja / ko / zh-TW / es / fr / de / pt / it / vi)
node cli.mjs install --lang ja

# Or double-click `install.cmd` on Windows / run `sh install.sh` on macOS & Linux
```

### Optional Flags

```bash
# macOS: create a 3-line pure-shell Dock launcher that passes --remote-debugging-port=0 directly on launch
node cli.mjs install --lang ja --mac-launcher

# Optional: enable automatic background AI translation for new UI phrases in future updates (12h cooldown, read-only sandbox)
node cli.mjs install --auto-sync

# Optional: install SKILL.md into ~/.gemini/config/skills/antigravity-langpack-sync for in-chat sync triggers
node cli.mjs install --with-skill
```

### Switching Languages & CLI Commands

- **In-App Dropdown**: Open **`Settings → Appearance → Display Language`** and pick any option for an immediate live switch.
- **CLI**:
  ```bash
  node cli.mjs status          # Check daemon status, config & active ports
  node cli.mjs lang            # List all 14 locale packs & entry counts
  node cli.mjs lang ja         # Switch to Japanese immediately
  node cli.mjs lang en         # Switch back to original English
  node cli.mjs sync-ai         # Manually run one-shot read-only AI sync for newly added UI labels
  node cli.mjs auto-sync on    # Enable automatic background AI dictionary sync (or `off` to disable)
  node cli.mjs check           # Verify zero binaries & validate all scripts/JSON
  node cli.mjs uninstall       # Cleanly restore English UI & remove autostart
  ```

---

## How It Works & Operational Transparency

- **Cold-Start Debug Port Relay (`autoRelaunchCdp: true`)**: On Windows, `install` adds `--remote-debugging-port=0` to Desktop/Start Menu shortcuts so normal launches attach with zero relaunch. If Antigravity is launched without a debugging port (e.g., from Spotlight/CLI or right after `--updated`), the daemon **only** intercepts newly started processes (`<15s` old, `<25s` after `--updated`) with **no recent conversation database writes**, sends a graceful close (`CloseMainWindow` / `SIGTERM` — **never** `Stop-Process -Force` or `SIGKILL`), and relaunches once with `--remote-debugging-port=0`. If a window declines to close (e.g., unsaved prompt), it is immediately exempted and left untouched. Set `"autoRelaunchCdp": false` in `dict/config.json` to disable this behavior.
- **Event-Driven Session + Low-Frequency Discovery**: Connected windows communicate over persistent CDP WebSockets (`Page.frameNavigated` & `Runtime.bindingCalled`) plus `fs.watch` on `dict/`, with a lightweight 4-second local loopback port check (`127.0.0.1`) for newly opened windows (~0.0% idle CPU).
- **DOM Selector Scope**: Because `app.asar` is never modified, attaching the `Settings → Appearance` row relies on workbench and card selectors (with fallback matching on headings and `Theme`/`Font` rows). Routine updates work out of the box, whereas a major upstream UI rewrite of the Settings modal may require an updated `src/injector.js` selector (`sync-ai` only translates new text strings, not DOM layout changes).
- **Privacy & Default-Off AI Sync (`collectUntranslated: false`, `autoSyncAi: false`)**: Untranslated string collection and background AI calls are **off by default**, and `install` does **not** touch `~/.gemini/config/skills/` unless `--with-skill` is explicitly passed. Running `node cli.mjs sync-ai` manually invokes `agy` in `--mode plan --sandbox --disable-slash-commands` from the OS temp directory with strict JSON schema & script validation.

---

## License

Released under the [GNU General Public License v3.0 (GPL-3.0)](./LICENSE).

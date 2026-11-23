<div align="center">

# antigravity-langpack

**純明文零二進位檔、免改 `app.asar` 的 Google Antigravity 多語系原生介面語言包（涵蓋 13 種語言 / 14 套詞庫，支援 macOS / Windows / Linux，相容 Stable 正式版與 Insiders 預覽版）。**

<p>
  <a href="../README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <b>繁體中文</b> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="./demo.gif" width="840" alt="antigravity-langpack Native Display Language Switcher Demo" />
</p>

</div>

---

## 核心特點

1. **原生「設定 → 外觀」下拉選單即時切換（免重啟）**：
   於應用程式內建 `設定 → 外觀` 頂部自動嵌入與官方元件一致的 **「介面語言」** 選單，免重啟視窗即可即時切換 **13 種語言（14 套詞庫）或原版英文**，對齊 VS Code 繁體中文標準術語（`程式碼 / 檔案 / 資料夾 / 專案 / 預設 / 快取 / 剪貼簿`）。
2. **不修改 `app.asar`，macOS 免破簽章、常規自動更新免重打修補程式**：
   100% 保留 Google 官方 Apple 公證簽章，不觸發 Gatekeeper「應用程式已損毀」警告或反覆跳出鑰匙圈密碼視窗；常規自動更新後無須重新打修補程式。
3. **零 `.exe` 二進位檔、零第三方相依套件、免管理員權限**：
   全專案僅使用官方 `Node.js >= 22.13` 原生 API，所有程式碼透明可審計，無須管理員或 `sudo` 權限即可完成安裝。
4. **完整預載詞庫 + 按需唯讀沙箱補詞（預設關閉背景收集）**：
   每套詞庫均內建 **1,920 條** 完整詞條，預設關閉未翻譯字串收集與背景 AI 呼叫；當未來新版本出現未翻譯按鈕時，可手動執行 `node cli.mjs sync-ai` 於唯讀沙箱模式補齊至 `dict/learned.zh-TW.json`。

---

## 快速安裝

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 以繁體中文安裝啟動
node cli.mjs install --lang zh-TW

# 選用：macOS 產生純 Shell 指令碼 Dock 免重啟啟動器
node cli.mjs install --lang zh-TW --mac-launcher

# 選用：顯式安裝對話觸發技能至 ~/.gemini/config/skills/
node cli.mjs install --lang zh-TW --with-skill
```

解除安裝並還原英文原版介面：`node cli.mjs uninstall`。

---

## 運作機制與透明說明

- **冷啟動除錯埠補參（`autoRelaunchCdp: true`）**：若未帶 `--remote-debugging-port=0` 啟動，背景服務**僅針對剛啟動 `<15s` 且無近期對話寫入的新處理程序**發送溫和關閉請求（絕不使用 `-Force` / `SIGKILL` 強制終止；若視窗拒絕關閉則立即豁免放行）並附帶參數重開一次。可於 `dict/config.json` 設定 `"autoRelaunchCdp": false` 停用。
- **選擇器邊界與隱私預設值**：已連線視窗採 WebSocket 事件驅動（搭配 4 秒本機埠檢查）；預設不收集未翻譯文字、不自動呼叫 AI、亦不修改 `~/.gemini/config/skills/`。若未來上游大幅改版重構設定視窗 DOM 結構，則需更新選擇器。

---

## 授權條款

採用 OSI 認證之 [GNU General Public License v3.0 (GPL-3.0)](../LICENSE) 開源授權條款。

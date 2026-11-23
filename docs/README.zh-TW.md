<div align="center">

# antigravity-langpack

**純明文零二進位檔、免改 `app.asar`、每日更新不失效、免 API Key 自動補詞的 Google Antigravity 14 語系原生介面語言包（支援 macOS / Windows / Linux，相容 Stable 正式版與 Insiders 預覽版）。**

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
   於應用程式內建 `設定 → 外觀` 頂部自動嵌入與官方元件一致的 **「介面語言」** 選單，點選後 **30 毫秒內全視窗即時切換 14 種語言或原版英文**，對齊 VS Code 繁體中文標準術語（`程式碼 / 檔案 / 資料夾 / 專案 / 預設 / 快取 / 剪貼簿`）。
2. **不修改 `app.asar`，macOS 免破簽章、自動更新不掉詞**：
   100% 保留 Google 官方 Apple 公證簽章，絕不觸發 Gatekeeper「應用程式已損毀」警告或反覆跳出鑰匙圈密碼視窗；每日自動更新後無須重新安裝修補程式。
3. **零 `.exe` 二進位檔、零第三方相依套件、免管理員權限**：
   全專案僅使用官方 `Node.js >= 22.13` 原生 API，所有程式碼透明可審計，無須管理員或 `sudo` 權限即可完成安裝。
4. **免 API Key 新詞自動補齊**：
   每套語言均預先內建 **1,920 條** 完整詞庫；當新版本出現未翻譯按鈕時，背景服務可自動透過本機 Antigravity 補齊至 `dict/learned.zh-TW.json`。

---

## 快速安裝

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 以繁體中文安裝啟動
node cli.mjs install --lang zh-TW

# macOS 選用：產生純 Shell 指令碼 Dock 啟動器
node cli.mjs install --lang zh-TW --mac-launcher
```

解除安裝並還原英文原版介面：`node cli.mjs uninstall`。

---

## 授權條款

採用 [PolyForm Noncommercial License 1.0.0](../LICENSE)，免費供個人開發與原始碼審計使用，禁止任何商業轉售或移除原署名重新散佈。

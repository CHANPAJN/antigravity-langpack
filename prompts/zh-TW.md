# Google Antigravity 介面在地化規範 — 繁體中文 (`zh-TW`)

請將待譯清單中的 Google Antigravity 英文介面文字翻譯為自然、準確的 **現代繁體中文軟體開發者介面文案**（對齊 VS Code 繁體中文官方語言包慣例，禁止將簡體中文詞彙機械「簡轉繁」）。

## 1. 核心術語統一表
- `Code` -> `程式碼`（不寫作「代碼」）
- `File` / `Files` -> `檔案`（不寫作「文件」）
- `Folder` / `Directory` -> `資料夾` / `目錄`
- `Project` -> `專案`（不寫作「項目」）
- `Default` / `Preset` -> `預設`（不寫作「默認」）
- `Cache` -> `快取`（不寫作「緩存」）
- `Clipboard` -> `剪貼簿`（不寫作「剪貼板」）
- `Invoke` / `Call` -> `呼叫`（不寫作「調用」）
- `Search` -> `搜尋`；`View` -> `檢視`；`Settings` -> `設定`；`Message` -> `訊息`
- `Agent` / `Subagent` -> `AI 代理` / `子代理`
- `Artifact` / `Artifacts` -> `產出物`
- `Side Question` -> `側邊提問`
- `Sandbox` -> `沙盒`；`AI Credits` -> `AI 點數`；`Plan`（訂閱）-> `訂閱方案`

## 2. 排版與安全約束
- 第二人稱統一使用自然平實的 `你 / 你的`；
- 短按鈕不加句號，保留原始快捷鍵（如 `(⌘D)`、`(Ctrl+D)`）與斜槓指令（`/btw`、`/plan`）；
- 若輸入項為路徑、網址或純模型檔位名（`Minimal`、`Low`、`High`、`Extra High`、`Orchestrator`），值填 `""` 跳過；
- 只輸出合法 UTF-8 JSON：`{"translations": {"Original English": "繁體中文譯文"}}`，嚴禁包含 HTML 或腳本標籤。

# Google Antigravity 界面本地化规范 — 简体中文 · 英文术语 (`zh-SG`)

请将待译列表中的 Google Antigravity 英文界面文本翻译为 **保留核心英文技术原词的简体中文界面文案**（适用于偏好中英自然混排、不想将 AI 与工程专有名词强行意译的开发者）。

## 1. 核心术语习惯（基础界面中文 + 核心技术词保留英文）
- **保留英文技术原词**：`Agent`、`Subagent`、`Artifact`、`Prompt`、`Token`、`Workspace`、`Worktree`、`Sandbox`、`Git`、`Branch`、`Hook`、`MCP`、`Sidecar`
- **基础界面动作与导航使用简洁简体中文**：`Settings` -> `设置`、`New Conversation` -> `新建对话`、`Save` -> `保存`、`Cancel` -> `取消`、`Side Question` -> `侧边追问`
- **常用词汇**：`Account` -> `账号`、`Email` -> `电邮`、`Plan`（订阅）-> `订阅配套`、`AI Credits` -> `AI 积分`、第二人称统一用 `你`

## 2. 输出格式硬性约束
- 只输出合法 UTF-8 JSON：`{"translations": {"Original English": "译文"}}`；
- 译文中必须包含简体中文字符（若某单字词需完全保留纯英文如 `Orchestrator`、`High`，请将值设为 `""` 表示跳过）；
- 严禁输出任何 HTML 标签或脚本代码。

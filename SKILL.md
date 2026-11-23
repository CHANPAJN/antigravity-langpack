---
name: antigravity-langpack-sync
description: 免 API Key 自动扫描 Antigravity / Insiders 界面未翻译英文词条，并按当前激活语种（zh-CN / zh-TW / zh-SG / ja / ko / vi / hi / id / th / es / fr / de / pt / it）的母语规范增量更新词库 JSON（只写词库，不改代码）。当用户说“更新汉化词库”、“更新语言包”、“同步新词”或调用 /antigravity-langpack-sync 时执行。
---

# Antigravity 多语系免 Key 词库增量更新技能 (`antigravity-langpack`)

本技能直接利用当前会话的反重力模型算力，为本地 `antigravity-langpack` 多语系工具增量补齐新版本客户端出现的英文界面词条（支持 `zh-CN` 简体中文、`zh-SG` 简体中文·英文术语、`zh-TW` 繁體中文、`ja` 日本語、`ko` 한국어、`vi` Tiếng Việt、`hi` हिन्दी、`id` Bahasa Indonesia、`th` ภาษาไทย、`es` Español、`fr` Français、`de` Deutsch、`pt` Português、`it` Italiano）。**全程不需要任何外部 API Key，且只允许写入纯文本 JSON 词库 `dict/learned.<locale>.json`，严禁修改任何 `.js` / `.mjs` 代码文件。**

## 标准执行步骤

1. **查看当前激活语种并采集窗口未翻译英文词条**：
   ```bash
   node cli.mjs collect --json
   ```
2. **读取对应语种的当地母语规范提示词**：
   读取 `prompts/<locale>.md`（如 `prompts/zh-CN.md`、`prompts/ja.md`、`prompts/ko.md`、`prompts/vi.md` 等），严格按当地开发者习惯将 `candidates` 翻译为 `{"translations": {"English Key": "本地化译文"}}`（模型档位名或非界面路径设为空字符串 `""` 跳过）。
3. **通过安全沙箱写入增量词库**：
   ```bash
   node cli.mjs apply-dict --lang <locale> --stdin
   ```
   写入后守护进程自动热生效（也可直接在客户端「Settings → Appearance → Display Language」下拉菜单中点击秒切全部 14 套界面语言与原版英文）。

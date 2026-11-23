<div align="center">

# antigravity-langpack

**纯明文零二进制、免改 `app.asar` 的 Google Antigravity 多语言界面包（覆盖 13 种语言 / 14 套词库，支持 Windows / macOS / Linux，兼容正式版与 Insiders 预览版）。**

<p>
  <a href="../README.md">English</a> ·
  <b>简体中文</b> ·
  <a href="./README.zh-TW.md">繁體中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="./demo.gif" width="840" alt="antigravity-langpack Native Display Language Switcher Demo" />
</p>

</div>

---

## 核心特性

1. **原生「设置 → 外观」下拉即时切换（免重启）**：
   在客户端 `设置 → 外观` 卡片第一行自动挂载与官方样式一致的 **「界面语言」** 下拉框，无需重启窗口即可在 **13 种语言（14 套词库，含 `简体中文` 与保留 `Agent / Artifact` 原词的 `简体中文 (英文术语)`）** 和原版英文之间即时切换。
2. **不改 `app.asar`，macOS 不破签名、常规更新免重打补丁**：
   完全不触碰客户端安装目录文件：macOS 上 100% 保留 Google 官方公证签名（不弹“应用已损坏”或钥匙串密码框）；正式版与 Insiders 日常自动升级后无需重新手动打补丁。
3. **100% 纯明文、零 `.exe`、零第三方依赖、免管理员权限**：
   全仓库无任何 `.exe` / `.dll` 二进制文件，`package.json` 零外部依赖，源码透明可审；仅写入当前用户目录（无需管理员权限或 `sudo`）。
4. **全量预置词库 + 按需沙箱增量补词（默认零后台采集）**：
   每套语言均预置 **1,920 条** 完整校准词条，开箱即用。默认关闭后台文本收集与自动调用 AI；当未来新版本新增未翻译按钮时，可手动运行 `node cli.mjs sync-ai` 通过本机只读沙箱模式增量补齐至 `dict/learned.<lang>.json`。

---

## 快速安装

需要官方 **Node.js >= 22.13.0**。

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 默认安装（简体中文）
node cli.mjs install

# 指定初始语言（如保留英文术语版 zh-en、繁中 zh-TW、日语 ja 等）
node cli.mjs install --lang zh-en

# 可选参数：macOS 生成 3 行纯 Shell 脚本的 Dock 免重开启动器
node cli.mjs install --mac-launcher

# 可选参数：开启新版本未翻译按钮后台自动补词（12 小时冷却锁 + 只读沙箱）
node cli.mjs install --auto-sync

# 可选参数：显式安装对话触发技能至 ~/.gemini/config/skills/
node cli.mjs install --with-skill
```

日常也可随时用一行命令手动补词或开关后台自动补词（实时热生效，无需重启）：
```bash
node cli.mjs sync-ai         # 手动触发一次增量新词翻译
node cli.mjs auto-sync on    # 开启后台自动检测并翻译新词（传 off 关闭）
```

Windows 用户也可直接双击仓库根目录的纯明文 `install.cmd` 完成安装；卸载与还原英文只需运行 `node cli.mjs uninstall`。

---

## 工作原理与透明说明

- **冷启动调试端口补参机制（`autoRelaunchCdp: true`）**：Windows 安装时会自动为桌面/开始菜单快捷方式补齐 `--remote-debugging-port=0`（从快捷方式启动零重启）。若从其它入口裸启动且未带调试口，守护进程**仅在进程刚启动 `<15s`（`--updated` 更新重开 `<25s`）且最近 15 秒无对话数据库写入时**，发送温和关闭请求（`CloseMainWindow` / `SIGTERM`，**绝不使用 `-Force` 或 `SIGKILL` 强杀**；若窗口因未保存状态拒绝退出则立即豁免放行，绝不打断正在运行的 Agent 任务）并带参重开一次。如需关闭此行为，在 `dict/config.json` 中设 `"autoRelaunchCdp": false` 即可。
- **长连接事件驱动 + 低频本地端口发现**：已挂载窗口走本地 CDP WebSocket 事件推送与 `fs.watch` 配置监听，仅保留 4 秒一次的本地 `127.0.0.1` 端口轻量检查以发现新开窗口（实测空闲 CPU 约 `0.0%`）。
- **选择器适用边界**：因不修改 `app.asar`，界面挂载依赖工作台与设置卡片 DOM 选择器（含多级标题与字段回退）。常规版本更新无需重装；若未来大改版重构了设置页 DOM 结构，则需同步更新 `src/injector.js` 选择器（`sync-ai` 仅补新词条，不修补结构变更）。
- **默认零采集、零改 AI 配置**：`collectUntranslated` 与 `autoSyncAi` 默认均为 `false`，默认安装也不写入 `~/.gemini/config/skills/`；手动执行 `node cli.mjs sync-ai` 时强制开启 `--mode plan --sandbox --disable-slash-commands` 并在系统临时目录隔离执行。

---

## 开源许可

本项目采用 OSI 认证的 [GNU General Public License v3.0 (GPL-3.0)](../LICENSE) 开源许可协议。任何衍生修改或打包分发版本均须以相同 GPL-3.0 协议完整公开源代码。

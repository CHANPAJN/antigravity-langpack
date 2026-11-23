<div align="center">

# antigravity-langpack

**纯明文零二进制、免改安装包、日更不掉词、免 API Key 自动补词的 Google Antigravity 14 语种原生界面语言包（支持 Windows / macOS / Linux，同时兼容正式版与 Insiders 预览版）。**

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

1. **原生「设置 → 外观」下拉秒切（无需重启）**：
   在客户端 `设置 → 外观` 卡片第一行自动嵌入与官方样式一致的 **「界面语言」** 下拉框，点击后 **30 毫秒内全窗口原地切换 14 套语言或原版英文**，保留官方浅色/深色主题不乱改配色。
2. **不改 `app.asar`，Mac 不破签名、客户端日更不掉词**：
   完全不触碰客户端安装目录文件：macOS 上 100% 保留 Google 官方公证签名（不弹“应用已损坏”或钥匙串密码框）；正式版与 Insiders 每日自动升级后语言包自动保持，无需重新打补丁。
3. **100% 纯明文、零 `.exe`、零第三方依赖、免管理员权限**：
   全仓库无任何 `.exe` / `.dll` 二进制文件，`package.json` 零外部依赖，源码透明可审；仅写入当前用户目录（无需管理员权限或 `sudo`），也支持在受限办公电脑或保守权限模式下直接运行明文 `install.cmd` / `install.sh` 一键启用。
4. **免 API Key 新词后台自愈**：
   内置每套 **1,920 条** 完整校准词库（涵盖 `简体中文` 全中文版与保留 `Agent / Artifact` 原词的 `简体中文 (英文术语)` 双版本）。未来客户端更新出现新英文按钮时，后台按 12 小时冷却锁静默调用本机反重力自动补齐至 `dict/learned.<lang>.json`，也可随时在对话框发送「更新语言包」手动同步。

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

# macOS 可选生成 3 行纯 Shell 脚本的 Dock 零重拉启动器
node cli.mjs install --mac-launcher
```

Windows 用户也可直接双击仓库根目录的纯明文 `install.cmd` 完成安装；卸载与还原英文只需运行 `node cli.mjs uninstall`。

---

## 开源许可

本项目采用 [PolyForm Noncommercial License 1.0.0](../LICENSE) 许可协议，永久免费供个人使用与源码审计，禁止任何商业倒卖、付费引流或抹除署名换皮分发。

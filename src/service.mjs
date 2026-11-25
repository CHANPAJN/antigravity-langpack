/**
 * src/service.mjs — Cross-platform zero-binary service & macOS pure-script Dock launcher helper
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from './paths.mjs';
import { normalizeLocaleCode } from './locales.mjs';

export const PID_LOCK_FILE = path.join(os.tmpdir(), 'antigravity-langpack-daemon.pid');
export const MAC_PLIST_LABEL = 'io.github.antigravity-langpack.daemon';
export const AI_LANG_RULE_FILENAME = '99_antigravity_langpack_lang.md';
const DAEMON_ENTRY = path.join(PROJECT_ROOT, 'src', 'daemon.mjs');

const AI_OUTPUT_RULE_COPY = Object.freeze({
  'zh-CN':
    '请全程使用自然简练的简体中文进行内部思考推理（Thinking）、任务规划、工具步骤摘要（`toolSummary`）、子智能体角色命名及面向用户的回复；代码标识符、API 名称、命令行参数、文件路径与原始报错保持英文原样。',
  'zh-SG':
    '请全程使用简体中文进行内部思考推理（Thinking）、任务规划、工具步骤摘要与回复，同时自然保留常见英文技术术语（如 `Agent`、`Subagent`、`Artifact`、`Workspace`、`MCP`、API 与代码标识符）。',
  'zh-TW':
    '請全程使用自然流暢的繁體中文（台灣開發者慣用術語）進行內部思考推理（Thinking）、任務規劃、工具步驟摘要（`toolSummary`）與回覆；程式碼識別字、API 名稱、指令參數、檔案路徑與原始錯誤訊息保持英文原樣。',
  ja: '内部の思考プロセス（Thinking）、計画、ツールのステップ要約（`toolSummary`）、およびユーザーへの回答はすべて自然な日本語で行ってください。コード識別子、API 名、CLI 引数、ファイルパス、元のエラーメッセージは英語のまま維持してください。',
  ko: '내부 사고 과정(Thinking), 작업 계획, 도구 단계 요약(`toolSummary`) 및 사용자 응답은 모두 자연스러운 한국어로 작성하세요. 코드 식별자, API 이름, CLI 인자, 파일 경로 및 원본 오류 메시지는 영어 원문을 유지하세요.',
  ru: 'Выполняйте внутренние рассуждения (Thinking), планирование, краткие описания шагов (`toolSummary`) и ответы пользователю полностью на естественном русском языке. Идентификаторы кода, имена API, аргументы CLI, пути к файлам и тексты ошибок оставляйте в оригинале.',
  vi: 'Vui lòng sử dụng Tiếng Việt tự nhiên cho toàn bộ quá trình suy luận nội bộ (Thinking), lập kế hoạch, tóm tắt bước công cụ (`toolSummary`) và câu trả lời; giữ nguyên tiếng Anh cho tên biến, API, tham số CLI, đường dẫn tệp và thông báo lỗi gốc.',
  hi: 'कृपया आंतरिक सोच (Thinking), योजना, टूल चरण सारांश (`toolSummary`) और उपयोगकर्ता उत्तरों के लिए स्वाभाविक हिन्दी का उपयोग करें; कोड पहचानकर्ता, API नाम, CLI तर्क, फ़ाइल पथ और मूल त्रुटि संदेश अंग्रेज़ी में ही रखें।',
  id: 'Gunakan Bahasa Indonesia yang alami untuk seluruh proses berpikir internal (Thinking), perencanaan, ringkasan langkah alat (`toolSummary`), dan balasan pengguna; biarkan pengidentifikasi kode, nama API, argumen CLI, jalur file, dan pesan error asli tetap dalam bahasa Inggris.',
  th: 'โปรดใช้ภาษาไทยที่เป็นธรรมชาติสำหรับกระบวนการคิดภายใน (Thinking) การวางแผน สรุปขั้นตอนเครื่องมือ (`toolSummary`) และการตอบกลับผู้ใช้ โดยคงตัวระบุโค้ด ชื่อ API อาร์กิวเมนต์ CLI เส้นทางไฟล์ และข้อความแสดงข้อผิดพลาดต้นฉบับไว้เป็นภาษาอังกฤษ',
  es: 'Utiliza español natural en todo el razonamiento interno (Thinking), la planificación, los resúmenes de herramientas (`toolSummary`) y las respuestas al usuario; mantén en inglés los identificadores de código, nombres de API, rutas de archivos y errores originales.',
  fr: 'Utilisez un français naturel pour l’ensemble du raisonnement interne (Thinking), la planification, les résumés d’étapes (`toolSummary`) et les réponses ; conservez en anglais les identifiants de code, noms d’API, chemins de fichiers et messages d’erreur bruts.',
  de: 'Verwenden Sie für interne Überlegungen (Thinking), Planung, Werkzeug-Zusammenfassungen (`toolSummary`) und Antworten durchgängig natürliches Deutsch; belassen Sie Code-Bezeichner, API-Namen, Dateipfade und Original-Fehlermeldungen auf Englisch.',
  pt: 'Use português natural em todo o raciocínio interno (Thinking), planejamento, resumos de etapas (`toolSummary`) e respostas ao usuário; mantenha identificadores de código, nomes de API, caminhos de arquivos e mensagens de erro originais em inglês.',
  it: 'Usa un italiano naturale per tutto il ragionamento interno (Thinking), la pianificazione, i riepiloghi degli strumenti (`toolSummary`) e le risposte; mantieni in inglese gli identificatori di codice, i nomi delle API, i percorsi dei file e gli errori originali.'
});

export function syncAgentLanguageRule(localeCode = 'zh-CN', enabled = false, { customHome = '' } = {}) {
  const home = customHome || os.homedir();
  const rulesDir = path.join(home, '.gemini', 'config', 'rules');
  const rulePath = path.join(rulesDir, AI_LANG_RULE_FILENAME);
  const norm = normalizeLocaleCode(localeCode);

  if (!enabled || norm === 'en' || !AI_OUTPUT_RULE_COPY[norm]) {
    try {
      if (fs.existsSync(rulePath)) fs.unlinkSync(rulePath);
    } catch {}
    return '';
  }

  const content = [
    '<!-- antigravity-langpack:syncAiOutputLang -->',
    `# AI Thinking & Output Language (${norm})`,
    '',
    `- ${AI_OUTPUT_RULE_COPY[norm]}`,
    ''
  ].join('\n');

  try {
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(rulePath, content, 'utf8');
    return rulePath;
  } catch {
    return '';
  }
}

export function readDaemonPid() {
  try {
    if (!fs.existsSync(PID_LOCK_FILE)) return 0;
    const pid = Number.parseInt(fs.readFileSync(PID_LOCK_FILE, 'utf8').trim(), 10);
    if (!Number.isInteger(pid) || pid <= 0) return 0;
    process.kill(pid, 0);
    return pid;
  } catch {
    return 0;
  }
}

export function stopBackgroundDaemon() {
  const pid = readDaemonPid();
  if (pid > 0) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
  }
  try {
    if (fs.existsSync(PID_LOCK_FILE)) fs.unlinkSync(PID_LOCK_FILE);
  } catch {}
  return pid;
}

export function startBackgroundDaemon() {
  stopBackgroundDaemon();
  if (process.platform === 'win32') {
    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    const conhost = path.join(sysRoot, 'System32', 'conhost.exe');
    const cmdLine = `"${conhost}" --headless "${process.execPath}" --disable-warning=ExperimentalWarning "${DAEMON_ENTRY}"`;
    const psDetach = [
      '$ErrorActionPreference = "Stop"',
      `$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${cmdLine.replace(/'/g, "''")}' }`,
      'if ($res.ReturnValue -eq 0) { Write-Output $res.ProcessId } else { exit 1 }'
    ].join('; ');
    const wmiRun = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psDetach],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 8000
      }
    );
    if (wmiRun.status === 0) {
      for (let i = 0; i < 15; i++) {
        const lockPid = readDaemonPid();
        if (lockPid > 0) return lockPid;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      }
      const parsed = Number.parseInt(String(wmiRun.stdout || '').trim(), 10);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', DAEMON_ENTRY], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  return child.pid || 0;
}

export function installSkillLink() {
  const home = os.homedir();
  const srcSkill = path.join(PROJECT_ROOT, 'SKILL.md');
  if (!fs.existsSync(srcSkill)) return '';
  const dstDir = path.join(home, '.gemini', 'config', 'skills', 'antigravity-langpack-sync');
  const dstSkill = path.join(dstDir, 'SKILL.md');
  try {
    fs.mkdirSync(dstDir, { recursive: true });
    fs.writeFileSync(dstSkill, fs.readFileSync(srcSkill, 'utf8'), 'utf8');
    return dstSkill;
  } catch {
    return '';
  }
}

export function removeSkillLink() {
  const home = os.homedir();
  const dstDir = path.join(home, '.gemini', 'config', 'skills', 'antigravity-langpack-sync');
  try {
    if (fs.existsSync(dstDir)) fs.rmSync(dstDir, { recursive: true, force: true });
  } catch {}
}

export function installMacShellLaunchers(channels = [], targetAppsDir = path.join(os.homedir(), 'Applications')) {
  const created = [];
  fs.mkdirSync(targetAppsDir, { recursive: true });

  for (const ch of channels) {
    const appName = ch.channel === 'insiders' ? 'Antigravity - Insiders' : 'Antigravity';
    const sourceBundle = ch.appBundle || `/Applications/${appName}.app`;
    const wrapperName = `${appName} (i18n).app`;
    const wrapperDir = path.join(targetAppsDir, wrapperName);
    const contentsDir = path.join(wrapperDir, 'Contents');
    const macOsDir = path.join(contentsDir, 'MacOS');

    fs.mkdirSync(macOsDir, { recursive: true });

    const launcherSh =
      [
        '#!/bin/sh',
        '# Pure-text shell launcher — preserves official Apple notarization on target app',
        `exec /usr/bin/open -a "${sourceBundle}" --args --remote-debugging-port=0 "$@"`
      ].join('\n') + '\n';

    const launcherScriptPath = path.join(macOsDir, 'launch');
    fs.writeFileSync(launcherScriptPath, launcherSh, { encoding: 'utf8', mode: 0o755 });
    try {
      fs.chmodSync(launcherScriptPath, 0o755);
    } catch {}

    const bundleId =
      ch.channel === 'insiders'
        ? 'io.github.antigravity-langpack.launcher.insiders'
        : 'io.github.antigravity-langpack.launcher.stable';

    const infoPlist =
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0"><dict>',
        `  <key>CFBundleName</key><string>${appName} (i18n)</string>`,
        `  <key>CFBundleIdentifier</key><string>${bundleId}</string>`,
        '  <key>CFBundleVersion</key><string>1.2.0</string>',
        '  <key>CFBundlePackageType</key><string>APPL</string>',
        '  <key>CFBundleExecutable</key><string>launch</string>',
        '</dict></plist>'
      ].join('\n') + '\n';

    fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist, 'utf8');
    created.push(wrapperDir);
  }
  return created;
}

export function removeMacShellLaunchers(targetAppsDir = path.join(os.homedir(), 'Applications')) {
  for (const name of ['Antigravity (i18n).app', 'Antigravity - Insiders (i18n).app']) {
    const p = path.join(targetAppsDir, name);
    try {
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    } catch {}
  }
}

export function buildMacLaunchAgentXml(nodeExec = process.execPath, daemonPath = DAEMON_ENTRY) {
  return (
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0"><dict>',
      `  <key>Label</key><string>${MAC_PLIST_LABEL}</string>`,
      '  <key>ProgramArguments</key><array>',
      `    <string>${nodeExec}</string>`,
      '    <string>--disable-warning=ExperimentalWarning</string>',
      `    <string>${daemonPath}</string>`,
      '  </array>',
      '  <key>EnvironmentVariables</key><dict>',
      '    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>',
      '  </dict>',
      '  <key>RunAtLoad</key><true/>',
      '  <key>KeepAlive</key><true/>',
      '  <key>StandardOutPath</key><string>/tmp/antigravity-langpack-daemon.log</string>',
      '  <key>StandardErrorPath</key><string>/tmp/antigravity-langpack-daemon.err</string>',
      '</dict></plist>'
    ].join('\n') + '\n'
  );
}

export function configureAutostart(enable = true, { skipSystemCommands = false, customHome = '' } = {}) {
  const home = customHome || os.homedir();

  if (process.platform === 'darwin' || customHome) {
    const plistDir = path.join(home, 'Library', 'LaunchAgents');
    const plistPath = path.join(plistDir, `${MAC_PLIST_LABEL}.plist`);
    const uid = typeof process.getuid === 'function' ? process.getuid() : 501;

    if (!enable) {
      if (!skipSystemCommands && process.platform === 'darwin') {
        spawnSync('launchctl', ['bootout', `gui/${uid}/${MAC_PLIST_LABEL}`], { stdio: 'ignore' });
        spawnSync('launchctl', ['unload', '-w', plistPath], { stdio: 'ignore' });
      }
      try {
        if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
      } catch {}
      return plistPath;
    }

    fs.mkdirSync(plistDir, { recursive: true });
    fs.writeFileSync(plistPath, buildMacLaunchAgentXml(), 'utf8');
    if (!skipSystemCommands && process.platform === 'darwin') {
      spawnSync('launchctl', ['bootout', `gui/${uid}/${MAC_PLIST_LABEL}`], { stdio: 'ignore' });
      const boot = spawnSync('launchctl', ['bootstrap', `gui/${uid}`, plistPath], { stdio: 'ignore' });
      if (boot.status !== 0) {
        spawnSync('launchctl', ['load', '-w', plistPath], { stdio: 'ignore' });
      }
      spawnSync('launchctl', ['kickstart', '-k', `gui/${uid}/${MAC_PLIST_LABEL}`], { stdio: 'ignore' });
    }
    return plistPath;
  }

  if (process.platform === 'linux') {
    const unitDir = path.join(home, '.config', 'systemd', 'user');
    const unitPath = path.join(unitDir, 'antigravity-langpack.service');
    if (!enable) {
      if (!skipSystemCommands) {
        spawnSync('systemctl', ['--user', 'disable', '--now', 'antigravity-langpack.service'], { stdio: 'ignore' });
      }
      try {
        if (fs.existsSync(unitPath)) fs.unlinkSync(unitPath);
      } catch {}
      return unitPath;
    }
    fs.mkdirSync(unitDir, { recursive: true });
    const unit = [
      '[Unit]',
      'Description=Antigravity Multi-Language Localization Service',
      '[Service]',
      `ExecStart="${process.execPath}" --disable-warning=ExperimentalWarning "${DAEMON_ENTRY}"`,
      'Restart=always',
      'RestartSec=4',
      '[Install]',
      'WantedBy=default.target'
    ].join('\n');
    fs.writeFileSync(unitPath, unit, 'utf8');
    if (!skipSystemCommands) {
      spawnSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'ignore' });
      spawnSync('systemctl', ['--user', 'enable', '--now', 'antigravity-langpack.service'], { stdio: 'ignore' });
    }
    return unitPath;
  }

  const startupDir = path.join(
    process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup'
  );
  const lnkPath = path.join(startupDir, 'Antigravity-langpack.lnk');
  if (!enable) {
    try {
      if (fs.existsSync(lnkPath)) fs.unlinkSync(lnkPath);
    } catch {}
    if (!skipSystemCommands) {
      spawnSync('schtasks', ['/Delete', '/TN', 'AntigravityI18nDaemon', '/F'], { stdio: 'ignore', windowsHide: true });
    }
    return lnkPath;
  }
  if (!skipSystemCommands) {
    try {
      fs.mkdirSync(startupDir, { recursive: true });
      const sysRoot = process.env.SystemRoot || 'C:\\Windows';
      const conhost = path.join(sysRoot, 'System32', 'conhost.exe');
      const args = `--headless "${process.execPath}" --disable-warning=ExperimentalWarning "${DAEMON_ENTRY}"`;
      const psLnk = [
        '$ws = New-Object -ComObject WScript.Shell',
        `$sc = $ws.CreateShortcut('${lnkPath.replace(/'/g, "''")}')`,
        `$sc.TargetPath = '${conhost.replace(/'/g, "''")}'`,
        `$sc.Arguments = '${args.replace(/'/g, "''")}'`,
        `$sc.WorkingDirectory = '${PROJECT_ROOT.replace(/'/g, "''")}'`,
        '$sc.WindowStyle = 7',
        '$sc.Save()'
      ].join('; ');
      spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psLnk], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 8000
      });
    } catch {
      return '';
    }
  }
  return lnkPath;
}

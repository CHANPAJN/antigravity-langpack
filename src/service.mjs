/**
 * src/service.mjs — Cross-platform zero-binary service & macOS pure-script Dock launcher helper
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from './paths.mjs';

export const PID_LOCK_FILE = path.join(os.tmpdir(), 'antigravity-langpack-daemon.pid');
export const MAC_PLIST_LABEL = 'io.github.antigravity-langpack.daemon';
const DAEMON_ENTRY = path.join(PROJECT_ROOT, 'src', 'daemon.mjs');

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

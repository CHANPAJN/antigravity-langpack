/**
 * src/relaunch.mjs — Per-channel cold-start & post-update (--updated) CDP relay (Win / macOS / Linux)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { readDevToolsPort } from './paths.mjs';

const GUARD_PATH = path.join(os.tmpdir(), 'antigravity-langpack-relaunch-guard.json');

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleepBlocking(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, ms));
}

function readGuardState() {
  try {
    if (!fs.existsSync(GUARD_PATH)) return {};
    return JSON.parse(fs.readFileSync(GUARD_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeGuardState(state) {
  try {
    fs.writeFileSync(GUARD_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  } catch {}
}

function hasRecentConversationWrite(conversationsDir, windowMs = 15000) {
  if (!conversationsDir || !fs.existsSync(conversationsDir)) return false;
  const now = Date.now();
  try {
    for (const name of fs.readdirSync(conversationsDir)) {
      if (!name.endsWith('.db-wal')) continue;
      const st = fs.statSync(path.join(conversationsDir, name), { throwIfNoEntry: false });
      if (st && st.size > 4096 && now - st.mtimeMs < windowMs) return true;
    }
  } catch {}
  return false;
}

/**
 * Parses BSD/macOS and Linux `ps -o etime=` strings (`[[dd-]hh:]mm:ss`) into elapsed seconds.
 */
export function parsePosixElapsedSeconds(etimeRaw) {
  const s = String(etimeRaw || '').trim();
  if (!s) return Infinity;
  let days = 0;
  let timePart = s;
  const dashIdx = s.indexOf('-');
  if (dashIdx !== -1) {
    days = Number.parseInt(s.slice(0, dashIdx), 10);
    timePart = s.slice(dashIdx + 1);
    if (!Number.isFinite(days)) return Infinity;
  }
  const nums = timePart.split(':').map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return Infinity;
  if (nums.length === 2) return days * 86400 + nums[0] * 60 + nums[1];
  if (nums.length === 3) return days * 86400 + nums[0] * 3600 + nums[1] * 60 + nums[2];
  return Infinity;
}

/**
 * Tokenizes a command-line argument tail while preserving quoted paths/flags and dropping transient OS tokens.
 */
export function splitCommandArgs(tailRaw) {
  const s = String(tailRaw || '').trim();
  if (!s) return [];
  const tokens = [];
  let cur = '';
  let quote = '';
  let inToken = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < s.length && (s[i + 1] === '"' || s[i + 1] === '\\')) {
        cur += s[i + 1];
        i++;
      } else if (ch === quote) {
        quote = '';
      } else {
        cur += ch;
      }
      inToken = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inToken = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (inToken) {
        tokens.push(cur);
        cur = '';
        inToken = false;
      }
      continue;
    }
    cur += ch;
    inToken = true;
  }
  if (inToken) tokens.push(cur);

  const cleaned = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || /^-psn_\d+_\d+$/i.test(tok) || tok === '--updated' || /^--remote-debugging-port(?:=|$)/i.test(tok)) {
      continue;
    }
    if (tok === '--open-url') {
      const next1 = tokens[i + 1] || '';
      const next2 = tokens[i + 2] || '';
      if (next1 === '--' && /^(?:antigravity(?:-insiders|-ide)?|vscode):\/\/\/\?windowId=_blank$/i.test(next2)) {
        i += 2;
        continue;
      }
      if (/^(?:antigravity(?:-insiders|-ide)?|vscode):\/\/\/\?windowId=_blank$/i.test(next1)) {
        i += 1;
        continue;
      }
    }
    cleaned.push(tok);
  }
  return cleaned;
}

/**
 * Strips the leading executable path from a Windows Win32_Process CommandLine string and parses trailing arguments.
 */
export function extractWinCommandTail(fullCmd, exePath = '') {
  const raw = String(fullCmd || '').trim();
  if (!raw) return [];
  let rest = '';
  if (raw.startsWith('"')) {
    const endQuote = raw.indexOf('"', 1);
    if (endQuote !== -1) rest = raw.slice(endQuote + 1);
  } else if (exePath && raw.toLowerCase().startsWith(String(exePath).toLowerCase())) {
    rest = raw.slice(String(exePath).length);
  } else {
    const firstSpace = raw.search(/\s/);
    if (firstSpace !== -1) rest = raw.slice(firstSpace + 1);
  }
  return splitCommandArgs(rest);
}

const PROXY_ENV_KEY_RE = /^(?:http_proxy|https_proxy|all_proxy|no_proxy)$/i;

/**
 * Extracts proxy environment variables (`http_proxy`, `https_proxy`, `all_proxy`, `no_proxy` in upper/lower case)
 * from macOS `ps eww -o command=` output (`delimiter = 'space'`) or Linux `/proc/<pid>/environ` (`delimiter = 'nul'`).
 */
export function extractProxyEnvFromText(rawText, delimiter = 'space') {
  const out = {};
  const text = String(rawText || '');
  if (!text) return out;

  if (delimiter === 'nul') {
    for (const entry of text.split('\0')) {
      const eq = entry.indexOf('=');
      if (eq <= 0) continue;
      const k = entry.slice(0, eq).trim();
      const v = entry.slice(eq + 1).trim();
      if (PROXY_ENV_KEY_RE.test(k) && v && !/[\x00-\x1f]/.test(v)) {
        out[k] = v;
      }
    }
    return out;
  }

  const re = /(?:^|\s)((?:http_proxy|https_proxy|all_proxy|no_proxy)=[^\s\x00-\x1f]+)/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const pair = match[1];
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const k = pair.slice(0, eq);
    const v = pair.slice(eq + 1);
    if (PROXY_ENV_KEY_RE.test(k) && v) {
      out[k] = v;
    }
  }
  return out;
}

function captureProcessProxyEnv(pid, platform = process.platform) {
  if (!Number.isInteger(pid) || pid <= 0) return {};
  try {
    if (platform === 'darwin') {
      const psEnv = spawnSync('ps', ['eww', '-o', 'command=', '-p', String(pid)], {
        encoding: 'utf8',
        timeout: 1500
      });
      if (psEnv.status === 0 && psEnv.stdout) {
        return extractProxyEnvFromText(psEnv.stdout, 'space');
      }
    } else if (platform === 'linux') {
      const envPath = `/proc/${pid}/environ`;
      if (fs.existsSync(envPath)) {
        return extractProxyEnvFromText(fs.readFileSync(envPath, 'utf8'), 'nul');
      }
    }
  } catch {}
  return {};
}

/**
 * Parses a single `ps -axo pid=,etime=,command=` row on macOS (handles spaces in `Antigravity - Insiders.app`) or Linux.
 */
export function parsePosixHostProcessRow(row, platform = process.platform) {
  const m = String(row || '').trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
  if (!m) return null;
  const pid = Number.parseInt(m[1], 10);
  const ageSec = parsePosixElapsedSeconds(m[2]);
  const cmd = m[3];
  if (!pid || /--type=|--crashpad|Helper(?:\s|\.|\/)|sidecar_sdk|--ms-enable-electron-run-as-node/i.test(cmd)) {
    return null;
  }

  if (platform === 'darwin') {
    const macMatch = cmd.match(
      /^(\S.*?\/(?:Antigravity(?:\s-\sInsiders|\sIDE)?|Visual\s+Studio\s+Code)\.app)\/Contents\/MacOS\/(Antigravity(?:\s-\sInsiders|\sIDE)?|Electron)(?:\s+(.*))?$/
    );
    if (!macMatch) return null;
    const appBundle = macMatch[1];
    const execName = macMatch[2];
    const restArgs = macMatch[3] || '';
    const channel = /Visual\s+Studio\s+Code\.app/i.test(appBundle)
      ? 'vscode'
      : /Antigravity\s+IDE\.app/i.test(appBundle)
        ? 'ide'
        : /Insiders/i.test(appBundle) || /Insiders/i.test(execName)
          ? 'insiders'
          : 'stable';
    return {
      pid,
      channel,
      appBundle,
      exePath: `${appBundle}/Contents/MacOS/${execName}`,
      ageSec,
      hasCdpFlag: /--remote-debugging-port(?:=|\s|$)/i.test(cmd),
      hasUpdatedFlag: /--updated(?:\s|$)/i.test(cmd),
      extraArgs: splitCommandArgs(restArgs)
    };
  }

  const linuxMatch = cmd.match(/^(\/\S*\/(?:antigravity(?:-insiders|-ide)?|code))(?:\s+(.*))?$/i);
  if (!linuxMatch) return null;
  const exePath = linuxMatch[1];
  const restArgs = linuxMatch[2] || '';
  const channel = /\/code$/i.test(exePath)
    ? 'vscode'
    : /antigravity-ide$/i.test(exePath)
      ? 'ide'
      : /insiders/i.test(exePath)
        ? 'insiders'
        : 'stable';
  return {
    pid,
    channel,
    appBundle: '',
    exePath,
    ageSec,
    hasCdpFlag: /--remote-debugging-port(?:=|\s|$)/i.test(cmd),
    hasUpdatedFlag: /--updated(?:\s|$)/i.test(cmd),
    extraArgs: splitCommandArgs(restArgs)
  };
}

export function ensureWindowsShortcutsFlag(targetExePaths = []) {
  if (process.platform !== 'win32') return 0;
  const validExes = targetExePaths.filter(Boolean);
  if (validExes.length === 0) return 0;

  const escapedList = validExes.map((e) => `'${String(e).replace(/'/g, "''")}'`).join(', ');
  const psScript = [
    `$ErrorActionPreference = 'SilentlyContinue'`,
    `$targets = @(${escapedList})`,
    `$updated = 0`,
    `$sh = New-Object -ComObject WScript.Shell`,
    `$dirs = @(`,
    `  [Environment]::GetFolderPath('Desktop'),`,
    `  [Environment]::GetFolderPath('CommonDesktopDirectory'),`,
    `  (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'),`,
    `  [Environment]::GetFolderPath('CommonPrograms'),`,
    `  (Join-Path $env:APPDATA 'Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar')`,
    `)`,
    `foreach ($d in $dirs) {`,
    `  if (Test-Path -LiteralPath $d) {`,
    `    Get-ChildItem -LiteralPath $d -Recurse -File | Where-Object { $_.Name -like '*Antigravity*.lnk' -or $_.Name -like '*Visual Studio Code*.lnk' -or $_.Name -like '*VS Code*.lnk' } | ForEach-Object {`,
    `      $s = $sh.CreateShortcut($_.FullName)`,
    `      foreach ($exe in $targets) {`,
    `        if (($s.TargetPath -ieq $exe) -and ($s.Arguments -notmatch '--remote-debugging-port')) {`,
    `          $s.Arguments = ('--remote-debugging-port=0 ' + [string]$s.Arguments).Trim()`,
    `          $s.Save()`,
    `          $updated++`,
    `        }`,
    `      }`,
    `    }`,
    `  }`,
    `}`,
    `Write-Output $updated`
  ].join('\n');

  const res = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 6000
  });
  return Number.parseInt(String(res.stdout || '0').trim(), 10) || 0;
}

export function createRelaunchMonitor() {
  const exemptedByChannel = new Map();
  const nonHostPidCache = new Set();
  let busy = false;

  function pruneDeadPids() {
    for (const [ch, pid] of Array.from(exemptedByChannel.entries())) {
      if (!isProcessAlive(pid)) exemptedByChannel.delete(ch);
    }
    for (const pid of Array.from(nonHostPidCache)) {
      if (!isProcessAlive(pid)) nonHostPidCache.delete(pid);
    }
  }

  function listUnflaggedHostProcesses(unconnectedChannels) {
    if (unconnectedChannels.length === 0) return [];

    if (process.platform === 'win32') {
      const pendingImages = [];
      for (const chInfo of unconnectedChannels) {
        if (!chInfo.installed) continue;
        const exemptPid = exemptedByChannel.get(chInfo.channel);
        if (exemptPid && isProcessAlive(exemptPid)) continue;
        pendingImages.push({
          channel: chInfo.channel,
          imageName:
            chInfo.channel === 'vscode'
              ? 'Code.exe'
              : chInfo.channel === 'ide'
                ? 'Antigravity IDE.exe'
                : chInfo.channel === 'insiders'
                  ? 'Antigravity - Insiders.exe'
                  : 'Antigravity.exe'
        });
      }
      if (pendingImages.length === 0) return [];

      let anyCandidateAlive = false;
      for (const item of pendingImages) {
        const tl = spawnSync('tasklist', ['/FI', `IMAGENAME eq ${item.imageName}`, '/FO', 'CSV', '/NH'], {
          windowsHide: true,
          encoding: 'utf8',
          timeout: 2500
        });
        if (tl.status === 0 && tl.stdout) {
          for (const line of String(tl.stdout).split(/\r?\n/)) {
            const m = line.trim().match(/^"([^"]+)","(\d+)"/);
            if (m && m[1].toLowerCase() === item.imageName.toLowerCase()) {
              const pid = Number.parseInt(m[2], 10);
              if (pid > 0 && !nonHostPidCache.has(pid)) anyCandidateAlive = true;
            }
          }
        }
      }
      if (!anyCandidateAlive) return [];

      const wmiNameFilter = Array.from(new Set(pendingImages.map((i) => i.imageName)))
        .map((n) => `Name='${n}'`)
        .join(' OR ');
      const psProbe = [
        `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`,
        `$ErrorActionPreference = 'SilentlyContinue'`,
        `$now = [DateTime]::UtcNow`,
        `$list = Get-CimInstance Win32_Process -Filter "${wmiNameFilter}"`,
        `$hosts = @(); $workers = @()`,
        `foreach ($p in $list) {`,
        `  $id = [int]$p.ProcessId`,
        `  $cmd = [string]$p.CommandLine`,
        `  if ($cmd -match '--type=|--crashpad|--utility-sub-type=|--import=|sidecar_sdk|--ms-enable-electron-run-as-node') { $workers += $id; continue }`,
        `  $age = if ($p.CreationDate) { [Math]::Max(0, [int][Math]::Round(($now - ([DateTime]$p.CreationDate).ToUniversalTime()).TotalSeconds)) } else { 99999 }`,
        `  $hosts += @{ pid = $id; name = [string]$p.Name; exe = [string]$p.ExecutablePath; cmd = $cmd; ageSec = $age }`,
        `}`,
        `@{ hosts = $hosts; workers = $workers } | ConvertTo-Json -Compress -Depth 4`
      ].join('\n');

      const cim = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psProbe], {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 5000
      });
      if (cim.status !== 0 || !cim.stdout?.trim()) return [];

      try {
        const parsed = JSON.parse(cim.stdout.trim());
        const workers = Array.isArray(parsed.workers) ? parsed.workers : parsed.workers ? [parsed.workers] : [];
        for (const w of workers) {
          if (Number(w) > 0) nonHostPidCache.add(Number(w));
        }
        const hosts = Array.isArray(parsed.hosts) ? parsed.hosts : parsed.hosts ? [parsed.hosts] : [];
        return hosts.map((h) => {
          const targetName = `${h.name || ''} ${h.exe || ''}`;
          const ch = /\bcode\.exe\b/i.test(targetName)
            ? 'vscode'
            : /antigravity\s+ide/i.test(targetName)
              ? 'ide'
              : /insiders/i.test(targetName)
                ? 'insiders'
                : 'stable';
          const cmd = String(h.cmd || '');
          const exeStr = String(h.exe || '');
          const hasFlag = /--remote-debugging-port(?:=|\s|$)/i.test(cmd);
          if (hasFlag && Number(h.pid) > 0) nonHostPidCache.add(Number(h.pid));
          return {
            pid: Number(h.pid) || 0,
            channel: ch,
            appBundle: '',
            exePath: exeStr,
            ageSec: Number(h.ageSec) || 99999,
            hasCdpFlag: hasFlag,
            hasUpdatedFlag: /--updated(?:\s|$)/i.test(cmd),
            extraArgs: extractWinCommandTail(cmd, exeStr)
          };
        });
      } catch {
        return [];
      }
    }

    // BSD macOS & Linux `ps -axo pid=,etime=,command=`
    const eligibleSet = new Set();
    for (const chInfo of unconnectedChannels) {
      if (!chInfo.installed) continue;
      const exemptPid = exemptedByChannel.get(chInfo.channel);
      if (exemptPid && isProcessAlive(exemptPid)) continue;
      eligibleSet.add(chInfo.channel);
    }
    if (eligibleSet.size === 0) return [];

    const ps = spawnSync('ps', ['-axo', 'pid=,etime=,command='], { encoding: 'utf8', timeout: 2500 });
    if (ps.status !== 0 || !ps.stdout) return [];
    const results = [];
    for (const row of String(ps.stdout).split(/\r?\n/)) {
      const parsed = parsePosixHostProcessRow(row, process.platform);
      if (parsed && eligibleSet.has(parsed.channel)) results.push(parsed);
    }
    return results;
  }

  function checkAndRelaunchIfNeeded(unconnectedChannels) {
    if (busy || unconnectedChannels.length === 0) return false;
    pruneDeadPids();

    const procs = listUnflaggedHostProcesses(unconnectedChannels);
    if (procs.length === 0) return false;

    const guard = readGuardState();
    const now = Date.now();

    for (const proc of procs) {
      if (!proc.pid || proc.hasCdpFlag) continue;
      const chInfo = unconnectedChannels.find((c) => c.channel === proc.channel);
      if (!chInfo) continue;

      const maxAgeSec = proc.hasUpdatedFlag ? 25 : 15;
      if (proc.ageSec > maxAgeSec || hasRecentConversationWrite(chInfo.conversationsDir, 15000)) {
        exemptedByChannel.set(proc.channel, proc.pid);
        continue;
      }

      const recentPids = Array.isArray(guard.handledPids) ? guard.handledPids : [];
      if (recentPids.includes(proc.pid) || now - (Number(guard.lastAtMs) || 0) < 60000) {
        exemptedByChannel.set(proc.channel, proc.pid);
        continue;
      }

      busy = true;
      try {
        // Capture any user-injected proxy environment variables (e.g. macOS Automator / shell wrapper) BEFORE stopping pid
        const inheritedProxyEnv = captureProcessProxyEnv(proc.pid, process.platform);
        const relaunchArgs = ['--remote-debugging-port=0', ...(Array.isArray(proc.extraArgs) ? proc.extraArgs : [])];
        const mergedEnv =
          Object.keys(inheritedProxyEnv).length > 0 ? { ...process.env, ...inheritedProxyEnv } : process.env;

        writeGuardState({
          lastAtMs: now,
          channel: proc.channel,
          handledPids: [...recentPids.slice(-10), proc.pid]
        });

        if (process.platform === 'win32') {
          const stopCmd = `$gp = Get-Process -Id ${proc.pid} -ErrorAction SilentlyContinue; if ($gp) { [void]$gp.CloseMainWindow(); [void]$gp.WaitForExit(2200) }`;
          spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', stopCmd], {
            windowsHide: true,
            stdio: 'ignore',
            timeout: 4000
          });
          ensureWindowsShortcutsFlag([proc.exePath || chInfo.exePath]);
        } else {
          try {
            process.kill(proc.pid, 'SIGTERM');
          } catch {}
        }

        for (let i = 0; i < 30 && isProcessAlive(proc.pid); i++) {
          sleepBlocking(80);
        }
        if (isProcessAlive(proc.pid)) {
          exemptedByChannel.set(proc.channel, proc.pid);
          return false;
        }
        sleepBlocking(150);

        if (process.platform === 'darwin') {
          const macBundle = proc.appBundle || chInfo.appBundle;
          let launchedViaOpen = false;
          if (macBundle) {
            const openArgs = ['-a', macBundle];
            for (const [ek, ev] of Object.entries(inheritedProxyEnv)) {
              openArgs.push('--env', `${ek}=${ev}`);
            }
            openArgs.push('--args', ...relaunchArgs);
            const openRes = spawnSync('/usr/bin/open', openArgs, {
              stdio: 'ignore',
              timeout: 5000,
              env: mergedEnv
            });
            launchedViaOpen = openRes.status === 0;
          }
          if (!launchedViaOpen) {
            const fallbackExe = proc.exePath || chInfo.exePath;
            if (fallbackExe) {
              const child = spawn(fallbackExe, relaunchArgs, {
                detached: true,
                stdio: 'ignore',
                env: mergedEnv
              });
              child.unref();
            }
          }
        } else {
          const targetExe = proc.exePath || chInfo.exePath;
          if (targetExe) {
            const child = spawn(targetExe, relaunchArgs, {
              detached: true,
              stdio: 'ignore',
              windowsHide: false,
              env: mergedEnv
            });
            child.unref();
          }
        }
        return true;
      } finally {
        busy = false;
      }
    }
    return false;
  }

  return { checkAndRelaunchIfNeeded };
}

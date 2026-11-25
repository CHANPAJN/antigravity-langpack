#!/usr/bin/env node
/**
 * cli.mjs — Multi-language CLI for antigravity-langpack (Win / macOS / Linux, zero binary, key-free AI dict sync)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { RE_NON_ENGLISH_SCRIPT, SUPPORTED_LOCALES, getLocaleSpec, normalizeLocaleCode } from './src/locales.mjs';
import {
  DICT_DIR,
  FILES,
  PROJECT_ROOT,
  createPayloadBuilder,
  loadMergedDictionary,
  readDevToolsPort,
  readJsonFile,
  readTextFile,
  resolveActiveChannels,
  resolveLocaleFiles,
  sanitizeFlatDictionary,
  writeConfigFile
} from './src/paths.mjs';
import { ensureWindowsShortcutsFlag } from './src/relaunch.mjs';
import {
  configureAutostart,
  installMacShellLaunchers,
  installSkillLink,
  readDaemonPid,
  removeMacShellLaunchers,
  removeSkillLink,
  startBackgroundDaemon,
  stopBackgroundDaemon,
  syncAgentLanguageRule,
  syncIdeDisplayLanguage
} from './src/service.mjs';
import { evaluateOnTarget, fetchDevToolsPages } from './src/daemon.mjs';

const PROTECTED_TERMS = new Set([
  'Minimal',
  'Low',
  'Medium',
  'High',
  'Extra',
  'Extra High',
  'XHigh',
  'Max',
  'Orchestrator',
  'Orchestrator (Carbon)',
  'Orchestrator (Argon)',
  'Orchestrator (Neon)',
  'Antigravity',
  'Antigravity IDE',
  'Antigravity Insiders',
  'Google Antigravity',
  'Google',
  'Google Data Cloud',
  'Worktree',
  'Ctrl',
  'Alt',
  'Shift',
  'Cmd',
  'Enter',
  'Ctrl+Enter',
  'Cmd+Enter',
  'Shift+Enter',
  'Tari',
  'Nord',
  'Google Sans',
  'Google AI Ultra',
  'Google AI Pro'
]);

const RE_ALPHA = /[A-Za-z]/;
const RE_UNSAFE_VALUE = /[<>\x00-\x08\x0b\x0c\x0e-\x1f\u200b-\u200f\ufeff]/;
const RE_NON_UI_KEY =
  /^(?:https?:\/\/|file:\/\/|vscode-file:\/\/|sidecar:\/\/|[A-Za-z]:\\|\/[\w.-]+\/|[@#][\w.-]+|\S+@\S+\.\S+|\d+(?:\.\d+)*%?$|\d+[smhdw](?:\s+\d+[smhdw])*$|[0-9a-f]{8}-[0-9a-f-]{27}|v?\d+\.\d+\.\d+|[\w.-]+\.(?:md|json|mjs|js|cjs|ts|tsx|jsx|py|sh|cmd|bat|ps1|png|jpg|jpeg|gif|webp|svg|mp4|m4a|mp3|wav|txt|yml|yaml|toml|lock|css|html|pdf|zip)$)/i;

function getArgOption(args, flag, fallback = '') {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) return args[i + 1];
    if (args[i].startsWith(`${flag}=`)) return args[i].slice(flag.length + 1);
  }
  return fallback;
}

export function validateAndFilterTranslations(rawPayload, localeCode = '') {
  const result = { accepted: {}, rejected: [] };
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return result;
  }
  const effectiveLocale = localeCode || readJsonFile(FILES.config, {}).locale || 'zh-CN';
  const spec = getLocaleSpec(effectiveLocale);
  const isLatinLocale = spec.scriptType === 'latin';
  const sourceMap =
    rawPayload.translations && typeof rawPayload.translations === 'object' && !Array.isArray(rawPayload.translations)
      ? rawPayload.translations
      : rawPayload;

  for (const [rawKey, rawVal] of Object.entries(sourceMap)) {
    if (typeof rawKey !== 'string' || typeof rawVal !== 'string') {
      result.rejected.push({ key: String(rawKey), reason: 'non_string' });
      continue;
    }
    const key = rawKey.trim();
    const val = rawVal.trim();
    if (!val) continue;
    if (key.length < 2 || key.length > 520 || val.length > 680) {
      result.rejected.push({ key, reason: 'length_out_of_bounds' });
      continue;
    }
    if (PROTECTED_TERMS.has(key) || !RE_ALPHA.test(key) || RE_NON_UI_KEY.test(key)) {
      result.rejected.push({ key, reason: 'protected_or_non_ui_key' });
      continue;
    }
    if (RE_UNSAFE_VALUE.test(val)) {
      result.rejected.push({ key, reason: 'unsafe_characters' });
      continue;
    }
    if (isLatinLocale) {
      if (val.toLowerCase() === key.toLowerCase() || !/[A-Za-z\u00c0-\u024f\u1e00-\u1eff]/.test(val)) {
        result.rejected.push({ key, reason: 'unchanged_or_invalid_latin_translation' });
        continue;
      }
    } else if (!RE_NON_ENGLISH_SCRIPT.test(val)) {
      result.rejected.push({ key, reason: 'missing_localized_script' });
      continue;
    }
    result.accepted[key] = val;
  }
  return result;
}

export function saveLearnedTranslations(newEntries, localeCode = '') {
  fs.mkdirSync(DICT_DIR, { recursive: true });
  const cfg = readJsonFile(FILES.config, {});
  const targetLocale = normalizeLocaleCode(localeCode || cfg.locale || 'zh-CN');
  const { localeFiles, merged } = loadMergedDictionary(targetLocale);
  const currentLearned = sanitizeFlatDictionary(readJsonFile(localeFiles.learnedDict, {}));

  let addedCount = 0;
  let updatedCount = 0;
  for (const [k, v] of Object.entries(newEntries)) {
    if (merged[k] === v) continue;
    if (Object.prototype.hasOwnProperty.call(currentLearned, k)) updatedCount += 1;
    else addedCount += 1;
    currentLearned[k] = v;
  }

  fs.writeFileSync(localeFiles.learnedDict, `${JSON.stringify(currentLearned, null, 2)}\n`, 'utf8');
  return {
    locale: targetLocale,
    learnedFile: path.relative(PROJECT_ROOT, localeFiles.learnedDict),
    addedCount,
    updatedCount,
    totalLearned: Object.keys(currentLearned).length
  };
}

const LIVE_DOM_SCAN_EXPR = `(() => {
  const out = new Set();
  const rt = window.__AGI18N_RUNTIME__;
  if (rt && typeof rt.collectUntranslated === 'function') {
    for (const item of rt.collectUntranslated()) out.add(item);
  }
  const origMap = rt && rt.textOrigMap instanceof WeakMap ? rt.textOrigMap : null;
  const docTitlePrefix = String(document.title || '').split(' - ')[0].trim();
  const skipSel = 'code, pre, kbd, samp, script, style, noscript, textarea, input, [contenteditable="true"], .monaco-editor, .monaco-diff-editor, .explorer-folders-view, .tabs-and-actions-container .tab-label, .breadcrumbs-below-tabs, #status\\\\.scm, .xterm, [class*="xterm"], .prose, .markdown, [data-markdown-root], [data-testid*="message"], [data-testid*="turn"], [data-testid*="terminal"], [data-testid*="history"], [data-testid="tab-file-tree-sidebar"], [aria-label="File path breadcrumbs"], [data-testid="conversation-row-sidebar"] a[href^="/c/"], [data-testid="conversation-row-sidebar"] span.truncate, [data-testid="conversation-row-history"] a[href^="/c/"], [data-testid="conversation-row-history"] span.truncate, [data-testid="breadcrumb-segment"], [data-agi18n-ignore="true"]';
  if (document.body) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode() && out.size < 400) {
      const node = walker.currentNode;
      if (origMap && origMap.has(node)) continue;
      const p = node.parentElement;
      if (!p || p.closest(skipSel)) continue;
      const t = String(node.nodeValue || '').trim();
      if (docTitlePrefix && t === docTitlePrefix) continue;
      if (t.length >= 2 && t.length <= 160 && /[A-Za-z]/.test(t) && !/[\\u00c0-\\u024f\\u0900-\\u097f\\u0e00-\\u0e7f\\u1e00-\\u1eff\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af]/.test(t)) {
        out.add(t);
      }
    }
  }
  return Array.from(out);
})()`;

const DYNAMIC_KNOWN_PATTERNS = [
  /^\d+(?:\.\d+)?%\s*left$/i,
  /^\d+\s*(?:s|sec|secs|m|min|mins|h|hr|hrs|d|w|mo|y|yr|yrs)\s+ago$/i,
  /^Resets in\s+.+$/i,
  /^(?:Weekly|Daily|Monthly|\d+\s*[smhd])\s+limit(?:,\s*resets in\s+.+)?$/i,
  /^.+?\s+(?:Weekly|Daily|Monthly)\s+limit$/i,
  /^\d+\s+(?:files?\s+changed|tools?|tools?\s+excluded|active\s+conversations|updates?|projects?)$/i,
  /^See all\s*\(\d+\)$/i,
  /^Show\s+\d+\s+more\s+subagents?$/i,
  /^(?:Worked|Thought|Running)\s+for\s+.+$/i,
  /^Exited with code\s+-?\d+\.?$/i,
  /^(?:Explored|Edited|Ran)\b/i,
  /^Updated\s+.+$/i,
  /^You have used some of your (?:\d+-hour|weekly|daily|monthly) limit,\s*it will fully refresh in\s+.+$/i,
  /^(?:Show|Hide)\s+\d+\s+breakdowns?$/i,
  /^\d+\/\d+\s+steps?$/i,
  /^(?:Rules|Skills|Mcp Tools|MCP Tools|System|Conversation|Context|Tools|Memory|Files):\s*[\d,]+\s*tokens?$/i,
  /^(?:Load|No more) older messages,\s*showing\s+\d+\s+of\s+\d+$/i,
  /^Turn\s+\d+\s+of\s+\d+$/i,
  /^Still thinking,\s*\d+\s*seconds?$/i,
  /^Running\s+for\s+.+$/i,
  /^(?:Running|Searching|Editing|Reading)\s+.+$/,
  /^Select model,\s*current:\s*.+$/i,
  /^Model:\s*.+?,\s*Model cannot be changed while the agent is running$/i,
  /^Agent permissions preset(?: selector)?(?:,\s*current)?:\s*.+$/i,
  /^(?:Add shortcut for|Remove shortcut\s+.+?\s+for|Shortcut\s+.+?\s+for)\s+.+$/i,
  /^Close\s+.+$/,
  /^Send feedback as\s+\S+@\S+$/i,
  /^[“"]?\d+\s+comments?\s+in\s+.+[”"]?$/i,
  /^(?:Gemini|Claude|GPT|Llama|Qwen|DeepSeek)\b/i
];

export async function collectLiveUntranslated(explicitLocale = '') {
  const cfg = readJsonFile(FILES.config, {});
  const locale = normalizeLocaleCode(explicitLocale || cfg.locale || 'zh-CN');
  const { merged } = loadMergedDictionary(locale);
  const channels = resolveActiveChannels('auto');
  const rawFound = new Set();
  const scannedWindows = [];

  for (const ch of channels) {
    const port = readDevToolsPort(ch.portFile);
    if (!port) continue;
    const pages = await fetchDevToolsPages(port);
    for (const page of pages) {
      const isScannableIframe =
        page.type === 'iframe' && /^https?:\/\/(?:127\.0\.0\.1|localhost):\d+\//i.test(String(page.url || ''));
      if (page.type !== 'page' && !isScannableIframe) continue;
      const res = await evaluateOnTarget(page.webSocketDebuggerUrl, LIVE_DOM_SCAN_EXPR, 3000);
      if (res.ok && Array.isArray(res.value)) {
        scannedWindows.push({ channel: ch.channel, title: page.title || 'Workbench' });
        for (const phrase of res.value) rawFound.add(String(phrase).trim());
      }
    }
  }

  const candidates = [];
  for (const item of rawFound) {
    if (!item || item.length < 2 || item.length > 160) continue;
    if (merged[item]) continue;
    if (item.endsWith('.') && merged[item.slice(0, -1)]) continue;
    if (PROTECTED_TERMS.has(item) || RE_NON_UI_KEY.test(item)) continue;
    if (/[{}[\];<>`$\\]/.test(item) || /^[\W\d_]+$/.test(item)) continue;
    if (DYNAMIC_KNOWN_PATTERNS.some((re) => re.test(item))) continue;
    candidates.push(item);
  }

  return { locale, scannedWindows, candidates: candidates.sort() };
}

function resolveAgyBinary() {
  const cmdName = process.platform === 'win32' ? 'agy.exe' : 'agy';
  const check = spawnSync(cmdName, ['--help'], { stdio: 'ignore', windowsHide: true, timeout: 4000 });
  if (check.status === 0 || check.status === 1) return cmdName;

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const wingetDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetDir)) {
      for (const entry of fs.readdirSync(wingetDir)) {
        if (entry.startsWith('Google.AntigravityCLI')) {
          const candidate = path.join(wingetDir, entry, 'agy.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    }
  }
  return '';
}

function extractJsonObjectFromText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {}
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}

export async function runKeyFreeAiSync({ localeCode = '', explicitCandidates = null } = {}) {
  const cfg = readJsonFile(FILES.config, {});
  const locale = normalizeLocaleCode(localeCode || cfg.locale || 'zh-CN');
  const lf = resolveLocaleFiles(locale);

  const { scannedWindows, candidates } = explicitCandidates
    ? { scannedWindows: [], candidates: explicitCandidates }
    : await collectLiveUntranslated(locale);

  if (candidates.length === 0) {
    return { ok: true, locale, candidates: 0, addedCount: 0, message: 'No untranslated UI phrases found.' };
  }

  const agyBin = resolveAgyBinary();
  if (!agyBin) {
    return {
      ok: false,
      locale,
      candidates: candidates.length,
      error: 'Official `agy` CLI not found in PATH. Open Antigravity chat and send "更新汉化词库" to translate via SKILL.md without CLI.'
    };
  }

  const specText = readTextFile(lf.promptSpec, '');
  const batch = candidates.slice(0, 60);
  const schema = JSON.stringify({
    type: 'object',
    properties: {
      translations: {
        type: 'object',
        additionalProperties: { type: 'string' }
      }
    },
    required: ['translations']
  });

  const fullPrompt = [
    specText.trim(),
    '',
    `## Target Locale: ${locale} (${lf.spec.name})`,
    '## Untranslated English UI Phrases (JSON Array)',
    JSON.stringify(batch, null, 2),
    '',
    'Return ONLY the valid JSON object {"translations": {...}}:'
  ].join('\n');

  const run = spawnSync(
    agyBin,
    ['--mode', 'plan', '--sandbox', '--disable-slash-commands', '--output-format', 'text', '--json-schema', schema, '-p', fullPrompt],
    {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 90000,
      maxBuffer: 4 * 1024 * 1024
    }
  );

  if (run.status !== 0 && !run.stdout?.trim()) {
    return {
      ok: false,
      locale,
      candidates: batch.length,
      error: (run.stderr || 'agy CLI invocation failed').trim().slice(0, 300)
    };
  }

  const parsed = extractJsonObjectFromText(run.stdout);
  if (!parsed) {
    return { ok: false, locale, candidates: batch.length, error: 'Failed to parse JSON output from agy CLI.' };
  }

  const { accepted, rejected } = validateAndFilterTranslations(parsed, locale);
  const saveRes = saveLearnedTranslations(accepted, locale);
  return {
    ok: true,
    scannedWindows,
    candidates: batch.length,
    acceptedCount: Object.keys(accepted).length,
    rejectedCount: rejected.length,
    ...saveRes,
    sample: Object.entries(accepted).slice(0, 10)
  };
}

export function runRepoSelfCheck() {
  const binaryExts = new Set(['.exe', '.dll', '.so', '.dylib', '.node', '.bin', '.asar']);
  const jsFiles = [];
  const jsonFiles = [];
  const binaries = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (binaryExts.has(ext)) binaries.push(path.relative(PROJECT_ROOT, full));
        if (ext === '.mjs' || ext === '.js') jsFiles.push(full);
        if (ext === '.json') jsonFiles.push(full);
      }
    }
  }

  walk(PROJECT_ROOT);
  if (binaries.length > 0) {
    throw new Error(`Binary files are forbidden in repository: ${binaries.join(', ')}`);
  }

  for (const file of jsFiles) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  }

  for (const jf of jsonFiles) {
    JSON.parse(fs.readFileSync(jf, 'utf8'));
  }

  return { checkedScripts: jsFiles.length, checkedJson: jsonFiles.length, binariesFound: 0 };
}

async function main() {
  const [cmd = 'status', ...args] = process.argv.slice(2);
  const asJson = args.includes('--json');
  const langOpt = getArgOption(args, '--lang', '');

  if (cmd === 'check') {
    const res = runRepoSelfCheck();
    console.log(JSON.stringify({ ok: true, ...res }, null, 2));
    return;
  }

  if (cmd === 'lang') {
    const targetArg = args.find((a) => !a.startsWith('--'));
    if (targetArg) {
      const updated = writeConfigFile({ locale: targetArg });
      syncAgentLanguageRule(updated.locale, updated.syncAiOutputLang === true);
      const ideLang = syncIdeDisplayLanguage(updated.locale);
      const { dictCount } = createPayloadBuilder().refreshIfNeeded();
      console.log(
        JSON.stringify(
          {
            ok: true,
            activeLocale: updated.locale,
            languageName: updated.locale === 'en' ? 'English (Default)' : SUPPORTED_LOCALES[updated.locale]?.name,
            dictCount,
            ...(ideLang.installed ? { ideLang } : {})
          },
          null,
          2
        )
      );
      return;
    }
    const cfg = readJsonFile(FILES.config, {});
    const active = normalizeLocaleCode(cfg.locale || 'zh-CN');
    const available = Object.values(SUPPORTED_LOCALES).map((spec) => ({
      code: spec.code,
      name: spec.name,
      active: spec.code === active,
      entries: Object.keys(loadMergedDictionary(spec.code).merged).length
    }));
    console.log(JSON.stringify({ activeLocale: active, supportedLocales: available }, null, 2));
    return;
  }

  if (cmd === 'status') {
    const builder = createPayloadBuilder();
    const { buildId, config, dictCount } = builder.refreshIfNeeded();
    const channels = resolveActiveChannels(config.channel).map((c) => ({
      channel: c.channel,
      installed: c.installed,
      port: readDevToolsPort(c.portFile),
      exePath: c.exePath || c.appBundle
    }));
    console.log(
      JSON.stringify(
        {
          platform: process.platform,
          daemonPid: readDaemonPid(),
          locale: config.locale,
          languageName: SUPPORTED_LOCALES[config.locale]?.name,
          buildId,
          dictCount,
          config,
          channels
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === 'install') {
    const installPatch = {};
    if (langOpt) installPatch.locale = langOpt;
    if (args.includes('--auto-sync')) {
      installPatch.collectUntranslated = true;
      installPatch.autoSyncAi = true;
    }
    if (args.includes('--sync-ai-lang')) {
      installPatch.syncAiOutputLang = true;
    }
    if (Object.keys(installPatch).length > 0) writeConfigFile(installPatch);
    const currentCfg = readJsonFile(FILES.config, {});
    const activeLoc = currentCfg.locale || 'zh-CN';
    syncAgentLanguageRule(activeLoc, currentCfg.syncAiOutputLang === true);
    const ideLang = syncIdeDisplayLanguage(activeLoc);
    const channels = resolveActiveChannels('auto');
    let updatedShortcuts = 0;
    let macLaunchers = [];
    let serviceId = '';
    try {
      updatedShortcuts = ensureWindowsShortcutsFlag(channels.map((c) => c.exePath));
    } catch {}
    try {
      if (process.platform === 'darwin' && args.includes('--mac-launcher')) {
        macLaunchers = installMacShellLaunchers(channels.filter((c) => c.installed || c.channel === 'stable'));
      }
    } catch {}
    try {
      serviceId = configureAutostart(true);
    } catch {}
    const skillPath = args.includes('--with-skill') ? installSkillLink() : '';
    const pid = startBackgroundDaemon();
    const cfg = readJsonFile(FILES.config, {});
    const sandboxHint =
      !serviceId || !pid
        ? 'Detected restricted sandbox environment. Run `node cli.mjs install` (or double-click install.cmd / sh install.sh) once in your normal user terminal — zero admin/sudo needed.'
        : undefined;
    console.log(
      JSON.stringify(
        {
          ok: Boolean(pid > 0),
          platform: process.platform,
          locale: normalizeLocaleCode(cfg.locale || 'zh-CN'),
          daemonPid: pid,
          autostart: serviceId,
          updatedShortcuts,
          macLaunchers,
          skillInstalled: skillPath,
          ...(ideLang.installed ? { ideLang } : {}),
          ...(sandboxHint ? { sandboxHint } : {})
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === 'uninstall') {
    stopBackgroundDaemon();
    configureAutostart(false);
    removeSkillLink();
    syncAgentLanguageRule('en', false);
    syncIdeDisplayLanguage('en', { skipExtensionInstall: true });
    if (process.platform === 'darwin') removeMacShellLaunchers();
    for (const ch of resolveActiveChannels('auto')) {
      const port = readDevToolsPort(ch.portFile);
      if (!port) continue;
      const pages = await fetchDevToolsPages(port);
      for (const p of pages) {
        await evaluateOnTarget(
          p.webSocketDebuggerUrl,
          'window.__AGI18N_RUNTIME__ && window.__AGI18N_RUNTIME__.teardown(true)'
        );
      }
    }
    console.log(JSON.stringify({ ok: true, uninstalled: true }, null, 2));
    return;
  }

  if (cmd === 'collect') {
    const report = await collectLiveUntranslated(langOpt);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`[${report.locale}] Scanned windows: ${report.scannedWindows.length}`);
      console.log(`Untranslated UI candidates (${report.candidates.length}):`);
      for (const item of report.candidates) console.log(`  - ${item}`);
    }
    return;
  }

  if (cmd === 'apply-dict') {
    let rawInput = '';
    if (args.includes('--stdin')) {
      rawInput = fs.readFileSync(0, 'utf8');
    } else {
      const fileArg = args.find((a) => !a.startsWith('--'));
      if (!fileArg || !fs.existsSync(fileArg)) {
        throw new Error('Usage: node cli.mjs apply-dict [--lang <locale>] <json-file> | --stdin');
      }
      rawInput = fs.readFileSync(fileArg, 'utf8');
    }
    const parsed = extractJsonObjectFromText(rawInput);
    if (!parsed) throw new Error('Input is not valid JSON.');
    const { accepted, rejected } = validateAndFilterTranslations(parsed, langOpt);
    const saved = saveLearnedTranslations(accepted, langOpt);
    console.log(
      JSON.stringify(
        {
          ok: true,
          acceptedCount: Object.keys(accepted).length,
          rejectedCount: rejected.length,
          ...saved
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === 'ai-lang') {
    const mode = (args.find((a) => !a.startsWith('--')) || '').toLowerCase();
    if (mode === 'on' || mode === 'enable' || mode === 'true') {
      const updated = writeConfigFile({ syncAiOutputLang: true });
      const ruleFile = syncAgentLanguageRule(updated.locale, true);
      console.log(JSON.stringify({ ok: true, syncAiOutputLang: true, locale: updated.locale, ruleFile }, null, 2));
      return;
    }
    if (mode === 'off' || mode === 'disable' || mode === 'false') {
      const updated = writeConfigFile({ syncAiOutputLang: false });
      syncAgentLanguageRule(updated.locale, false);
      console.log(JSON.stringify({ ok: true, syncAiOutputLang: false, locale: updated.locale, ruleFile: '' }, null, 2));
      return;
    }
    const cur = readJsonFile(FILES.config, {});
    console.log(
      JSON.stringify(
        {
          syncAiOutputLang: cur.syncAiOutputLang === true,
          locale: normalizeLocaleCode(cur.locale || 'zh-CN'),
          usage: 'node cli.mjs ai-lang <on|off>'
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === 'auto-sync') {
    const mode = (args.find((a) => !a.startsWith('--')) || '').toLowerCase();
    if (mode === 'on' || mode === 'enable' || mode === 'true') {
      const updated = writeConfigFile({ collectUntranslated: true, autoSyncAi: true });
      console.log(
        JSON.stringify(
          { ok: true, autoSyncAi: updated.autoSyncAi, collectUntranslated: updated.collectUntranslated },
          null,
          2
        )
      );
      return;
    }
    if (mode === 'off' || mode === 'disable' || mode === 'false') {
      const updated = writeConfigFile({ collectUntranslated: false, autoSyncAi: false });
      console.log(
        JSON.stringify(
          { ok: true, autoSyncAi: updated.autoSyncAi, collectUntranslated: updated.collectUntranslated },
          null,
          2
        )
      );
      return;
    }
    const cur = readJsonFile(FILES.config, {});
    console.log(
      JSON.stringify(
        {
          autoSyncAi: cur.autoSyncAi === true,
          collectUntranslated: cur.collectUntranslated === true,
          usage: 'node cli.mjs auto-sync <on|off>'
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === 'sync-ai') {
    const res = await runKeyFreeAiSync({ localeCode: langOpt });
    console.log(JSON.stringify(res, null, 2));
    if (!res.ok) process.exitCode = 1;
    return;
  }

  if (cmd === 'bootstrap-lang') {
    const targetArg = langOpt || args.find((a) => !a.startsWith('--'));
    if (!targetArg) throw new Error('Usage: node cli.mjs bootstrap-lang <zh-TW|ja|ko|th|zh-SG>');
    const locale = normalizeLocaleCode(targetArg);
    const zhCnKeys = Object.keys(readJsonFile(resolveLocaleFiles('zh-CN').baseDict, {}));
    const existing = loadMergedDictionary(locale).merged;
    const missing = zhCnKeys.filter((k) => !existing[k]);
    const res = await runKeyFreeAiSync({ localeCode: locale, explicitCandidates: missing });
    console.log(JSON.stringify({ remainingAfterBatch: Math.max(0, missing.length - 60), ...res }, null, 2));
    if (!res.ok) process.exitCode = 1;
    return;
  }

  console.error(
    `Unknown command: ${cmd}. Available: status | lang | check | install | uninstall | auto-sync | collect | apply-dict | sync-ai | bootstrap-lang`
  );
  process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  await main();
}

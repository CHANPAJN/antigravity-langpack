/**
 * src/paths.mjs — Cross-platform channel discovery, multi-locale loader & mtime-cached bundle builder
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LOCALE_MENU_OPTIONS, getLocaleSpec, normalizeLocaleCode } from './locales.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const SRC_DIR = __dirname;
export const DICT_DIR = path.join(PROJECT_ROOT, 'dict');
export const PROMPTS_DIR = path.join(PROJECT_ROOT, 'prompts');

export const FILES = Object.freeze({
  config: path.join(DICT_DIR, 'config.json'),
  customCss: path.join(DICT_DIR, 'custom.css'),
  injector: path.join(SRC_DIR, 'injector.js')
});

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  locale: 'zh-CN',
  channel: 'auto',
  autoRelaunchCdp: true,
  enableCustomCss: true,
  collectUntranslated: false,
  autoSyncAi: false,
  syncAiOutputLang: false
});

export function resolveLocaleFiles(localeCode = 'zh-CN') {
  const norm = normalizeLocaleCode(localeCode);
  const effective = norm === 'en' ? 'zh-CN' : norm;
  const spec = getLocaleSpec(effective);
  const code = spec.code;
  const fallbackBase = spec.fallbackLocale ? path.join(DICT_DIR, `base.${spec.fallbackLocale}.json`) : '';
  return {
    locale: norm,
    spec,
    fallbackBaseDict: fallbackBase,
    baseDict: path.join(DICT_DIR, `base.${code}.json`),
    learnedDict: path.join(DICT_DIR, `learned.${code}.json`),
    promptSpec: path.join(PROMPTS_DIR, spec.promptFile)
  };
}

export function stripBom(text) {
  const s = String(text ?? '');
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function readJsonFile(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = stripBom(fs.readFileSync(filePath, 'utf8')).trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeConfigFile(patch = {}) {
  fs.mkdirSync(DICT_DIR, { recursive: true });
  const current = readJsonFile(FILES.config, DEFAULT_CONFIG);
  const merged = {
    ...DEFAULT_CONFIG,
    ...current,
    ...patch
  };
  merged.locale = normalizeLocaleCode(merged.locale);
  if (patch.locale !== undefined && patch.enabled === undefined) {
    merged.enabled = merged.locale !== 'en';
  }
  fs.writeFileSync(FILES.config, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}

export function readTextFile(filePath, fallback = '') {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return stripBom(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function statSignature(filePath) {
  try {
    if (!filePath) return '0:0';
    const st = fs.statSync(filePath, { throwIfNoEntry: false });
    return st ? `${st.mtimeMs}:${st.size}` : '0:0';
  } catch {
    return '0:0';
  }
}

export function resolveChannelInfo(channelId, { customHome = '' } = {}) {
  const home = customHome || os.homedir();
  const isInsiders = channelId === 'insiders';
  const isIde = channelId === 'ide';
  const appDataName = isIde ? 'Antigravity IDE' : isInsiders ? 'Antigravity - Insiders' : 'Antigravity';
  const geminiStateName = isInsiders ? 'antigravity-insiders' : 'antigravity';

  let userDataDir = '';
  let exeCandidates = [];
  let cliCandidates = [];
  let macAppBundles = [];

  if (process.platform === 'win32') {
    const appData = customHome ? path.join(home, 'AppData', 'Roaming') : process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = customHome ? path.join(home, 'AppData', 'Local') : process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const winInstallFolder = isIde ? 'Antigravity IDE' : isInsiders ? 'antigravity-insiders' : 'antigravity';
    const winExeName = isIde ? 'Antigravity IDE.exe' : isInsiders ? 'Antigravity - Insiders.exe' : 'Antigravity.exe';
    userDataDir = path.join(appData, appDataName);
    exeCandidates = [
      path.join(localAppData, 'Programs', winInstallFolder, winExeName),
      path.join(localAppData, 'Programs', appDataName, winExeName),
      path.join(progFiles, winInstallFolder, winExeName),
      path.join(progFiles, appDataName, winExeName)
    ];
    if (isIde) {
      cliCandidates = [
        path.join(localAppData, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
        path.join(progFiles, 'Antigravity IDE', 'bin', 'antigravity-ide.cmd')
      ];
    }
  } else if (process.platform === 'darwin') {
    const bundleName = `${appDataName}.app`;
    userDataDir = path.join(home, 'Library', 'Application Support', appDataName);
    macAppBundles = [path.join('/Applications', bundleName), path.join(home, 'Applications', bundleName)];
    exeCandidates = isIde
      ? macAppBundles.flatMap((b) => [
          path.join(b, 'Contents', 'MacOS', 'Electron'),
          path.join(b, 'Contents', 'MacOS', appDataName)
        ])
      : macAppBundles.map((b) => path.join(b, 'Contents', 'MacOS', appDataName));
    if (isIde) {
      cliCandidates = [
        ...macAppBundles.map((b) => path.join(b, 'Contents', 'Resources', 'app', 'bin', 'antigravity-ide')),
        '/usr/local/bin/antigravity-ide'
      ];
    }
  } else {
    const xdgConfig = customHome ? path.join(home, '.config') : process.env.XDG_CONFIG_HOME || path.join(home, '.config');
    const linuxBin = isIde ? 'antigravity-ide' : isInsiders ? 'antigravity-insiders' : 'antigravity';
    userDataDir = path.join(xdgConfig, appDataName);
    exeCandidates = [
      `/usr/bin/${linuxBin}`,
      `/usr/local/bin/${linuxBin}`,
      `/opt/${appDataName}/${linuxBin}`,
      `/usr/share/${linuxBin}/${linuxBin}`
    ];
    if (isIde) cliCandidates = exeCandidates;
  }

  const exePath = exeCandidates.find((p) => fs.existsSync(p)) || '';
  const cliPath = cliCandidates.find((p) => fs.existsSync(p)) || '';
  const appBundle = macAppBundles.find((b) => fs.existsSync(b)) || '';
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  const conversationsDir = path.join(home, '.gemini', geminiStateName, 'conversations');
  const ideDotDir = isIde ? path.join(home, '.antigravity-ide') : '';
  const argvPath = isIde ? path.join(ideDotDir, 'argv.json') : '';
  const extensionsDir = isIde ? path.join(ideDotDir, 'extensions') : '';
  const installed = Boolean(exePath || appBundle || fs.existsSync(userDataDir));

  return {
    channel: channelId,
    label: appDataName,
    userDataDir,
    portFile,
    exePath,
    cliPath,
    appBundle,
    conversationsDir,
    argvPath,
    extensionsDir,
    installed
  };
}

export function resolveActiveChannels(channelMode = 'auto') {
  if (channelMode === 'stable') return [resolveChannelInfo('stable')];
  if (channelMode === 'insiders') return [resolveChannelInfo('insiders')];
  if (channelMode === 'ide') return [resolveChannelInfo('ide')];
  return [resolveChannelInfo('stable'), resolveChannelInfo('insiders'), resolveChannelInfo('ide')];
}

export function readDevToolsPort(portFile) {
  try {
    if (!fs.existsSync(portFile)) return 0;
    const firstLine = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]?.trim() || '';
    const port = Number.parseInt(firstLine, 10);
    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 0;
  } catch {
    return 0;
  }
}

export function sanitizeFlatDictionary(obj) {
  const clean = Object.create(null);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return clean;
  for (const [k, v] of Object.entries(obj)) {
    if (!k || k.startsWith('_') || typeof v !== 'string') continue;
    if (!v.trim()) continue;
    clean[k] = v;
  }
  return clean;
}

export function loadMergedDictionary(localeCode = 'zh-CN') {
  const norm = normalizeLocaleCode(localeCode);
  if (norm === 'en') {
    return { localeFiles: resolveLocaleFiles('en'), merged: Object.create(null) };
  }
  const lf = resolveLocaleFiles(norm);
  const fbDict = lf.fallbackBaseDict ? sanitizeFlatDictionary(readJsonFile(lf.fallbackBaseDict, {})) : {};
  const baseDict = sanitizeFlatDictionary(readJsonFile(lf.baseDict, {}));
  const learnedDict = sanitizeFlatDictionary(readJsonFile(lf.learnedDict, {}));
  return {
    localeFiles: lf,
    merged: Object.assign(Object.create(null), fbDict, baseDict, learnedDict)
  };
}

export function createPayloadBuilder() {
  let lastSig = '';
  let cachedScript = '';
  let cachedBuildId = '';
  let cachedConfig = { ...DEFAULT_CONFIG };
  let cachedDictCount = 0;

  function refreshIfNeeded() {
    const rawCfg = readJsonFile(FILES.config, {});
    const locale = normalizeLocaleCode(rawCfg.locale || 'zh-CN');
    const lf = resolveLocaleFiles(locale);

    const sig = [
      locale,
      statSignature(FILES.config),
      statSignature(lf.fallbackBaseDict),
      statSignature(lf.baseDict),
      statSignature(lf.learnedDict),
      statSignature(FILES.customCss),
      statSignature(FILES.injector)
    ].join('|');

    if (sig === lastSig && cachedScript) {
      return {
        changed: false,
        buildId: cachedBuildId,
        script: cachedScript,
        config: cachedConfig,
        dictCount: cachedDictCount
      };
    }

    const enabled = locale !== 'en' && rawCfg.enabled !== false;
    const config = {
      enabled,
      locale,
      channel: ['auto', 'stable', 'insiders', 'ide'].includes(rawCfg.channel) ? rawCfg.channel : 'auto',
      autoRelaunchCdp: rawCfg.autoRelaunchCdp !== false,
      enableCustomCss: rawCfg.enableCustomCss !== false,
      collectUntranslated: rawCfg.collectUntranslated === true,
      autoSyncAi: rawCfg.autoSyncAi === true,
      syncAiOutputLang: rawCfg.syncAiOutputLang === true
    };

    const { merged } = loadMergedDictionary(locale);
    const dictCount = Object.keys(merged).length;
    const customCss = config.enableCustomCss ? readTextFile(FILES.customCss, '') : '';
    const injectorTemplate = readTextFile(FILES.injector, '');

    const digest = crypto
      .createHash('sha256')
      .update(JSON.stringify(config))
      .update(JSON.stringify(merged))
      .update(customCss)
      .update(injectorTemplate)
      .digest('hex')
      .slice(0, 10);

    const buildId = `agi18n-${locale}-${digest}`;
    const payload = {
      buildId,
      locale: enabled ? locale : 'en',
      enabled,
      syncAiOutputLang: config.syncAiOutputLang,
      collectUntranslated: config.collectUntranslated,
      customCss,
      localeOptions: LOCALE_MENU_OPTIONS,
      contextOverrides: lf.spec.contextOverrides,
      patterns: lf.spec.patterns,
      dict: merged
    };

    cachedScript = `${injectorTemplate}\nwindow.__AGI18N_BOOT__ && window.__AGI18N_BOOT__(${JSON.stringify(payload)});`;
    cachedBuildId = buildId;
    cachedConfig = config;
    cachedDictCount = dictCount;
    lastSig = sig;

    return { changed: true, buildId, script: cachedScript, config, dictCount };
  }

  return {
    refreshIfNeeded,
    getCurrent: () => ({
      buildId: cachedBuildId,
      script: cachedScript,
      config: cachedConfig,
      dictCount: cachedDictCount
    })
  };
}

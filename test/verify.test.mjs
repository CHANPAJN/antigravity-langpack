/**
 * test/verify.test.mjs — Automated cross-platform & multi-locale test suite
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { LOCALE_MENU_OPTIONS, SUPPORTED_LOCALES } from '../src/locales.mjs';
import {
  DEFAULT_CONFIG,
  FILES,
  PROJECT_ROOT,
  createPayloadBuilder,
  loadMergedDictionary,
  readJsonFile,
  resolveActiveChannels,
  resolveLocaleFiles,
  writeConfigFile
} from '../src/paths.mjs';
import {
  extractProxyEnvFromText,
  extractWinCommandTail,
  parsePosixElapsedSeconds,
  parsePosixHostProcessRow,
  splitCommandArgs
} from '../src/relaunch.mjs';
import {
  AI_LANG_RULE_FILENAME,
  configureAutostart,
  ensureIdeLanguagePacksRegistry,
  installMacShellLaunchers,
  patchVscodeArgvJsonc,
  removeMacShellLaunchers,
  syncAgentLanguageRule
} from '../src/service.mjs';
import { runRepoSelfCheck, saveLearnedTranslations, validateAndFilterTranslations } from '../cli.mjs';

test('Repository contains zero binary files (.exe/.dll/.node) and all scripts/JSON pass syntax check', () => {
  const res = runRepoSelfCheck();
  assert.equal(res.binariesFound, 0);
  assert.ok(res.checkedScripts >= 7);
  assert.ok(res.checkedJson >= 7);
});

test('package.json has zero third-party npm dependencies', () => {
  const pkg = readJsonFile(path.join(PROJECT_ROOT, 'package.json'), {});
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});

test('Base Simplified Chinese dictionary has clean terminology and zero legacy translationese', () => {
  const { merged } = loadMergedDictionary('zh-CN');
  const entries = Object.entries(merged);
  assert.ok(entries.length >= 1850, `Expected >= 1850 entries, got ${entries.length}`);

  assert.equal(merged['Artifacts'], '生成产物');
  assert.equal(merged['Subagents'], '子智能体');
  assert.equal(merged['Side Question'], '侧边追问');
  assert.equal(merged['Started from the main conversation'], '从主对话发起');
  assert.equal(merged['Reveal in Finder'], '在访达中显示');

  const allValues = entries.map(([, v]) => v).join('\n');
  assert.equal(/您|工件|子代理|旁路提问|支线提问|沙盒|点数|账户|键入|蜂群|侧车|发起自主对话/.test(allValues), false);
});

test('All 15 supported locales have full dictionaries and prompt specs', () => {
  assert.equal(Object.keys(SUPPORTED_LOCALES).length, 15);
  const zhKeys = Object.keys(loadMergedDictionary('zh-CN').merged);
  assert.ok(zhKeys.length >= 2060, `Expected >= 2060 zh-CN keys, got ${zhKeys.length}`);

  for (const code of Object.keys(SUPPORTED_LOCALES)) {
    const lf = resolveLocaleFiles(code);
    assert.ok(fs.existsSync(lf.promptSpec), `Missing prompt spec for ${code}: ${lf.promptSpec}`);
    const { merged } = loadMergedDictionary(code);
    const keys = Object.keys(merged);
    assert.equal(keys.length, zhKeys.length, `Expected ${zhKeys.length} entries for ${code}, got ${keys.length}`);
    assert.equal(typeof merged['New Conversation'], 'string');
    assert.equal(typeof merged['Settings'], 'string');
    for (const [k, v] of Object.entries(merged)) {
      assert.equal(/[<>]/.test(v), false, `Unsafe angle bracket in ${code} key "${k}": "${v}"`);
    }
  }
  const sg = loadMergedDictionary('zh-SG').merged;
  assert.equal(sg['Email'], '电邮');
});

test('Multi-script validator handles CJK/Kana/Hangul/Thai/Devanagari & Latin (vi/id) while blocking unsafe payloads', () => {
  const nonLatinSample = {
    translations: {
      'Input Box': '输入框',
      'Traditional File': '開啟檔案',
      'Japanese Kana': 'アーティファクト',
      'Korean Hangul': '서브에이전트',
      'Hindi UI': 'सेटिंग्स खोलें',
      'Thai UI': 'ตั้งค่าระบบ',
      'XSS Test': '<script>alert(1)</script>危险',
      'ZeroWidth': '测试\u200b隐形字符',
      'Extra High': '超高',
      'https://example.com': '示例网址',
      'Skipped Item': '',
      'English Only': 'Still English'
    }
  };
  const res1 = validateAndFilterTranslations(nonLatinSample, 'zh-CN');
  assert.equal(Object.keys(res1.accepted).length, 6);
  assert.equal(res1.rejected.length, 5);

  const latinSample = {
    translations: {
      Settings: 'Pengaturan',
      Save: 'Simpan',
      Unchanged: 'Unchanged',
      XSS: '<b>Bahaya</b>'
    }
  };
  const resId = validateAndFilterTranslations(latinSample, 'id');
  assert.deepEqual(resId.accepted, { Settings: 'Pengaturan', Save: 'Simpan' });
  assert.equal(resId.rejected.length, 2);

  const viSample = {
    translations: {
      Settings: 'Cài đặt',
      Save: 'Lưu',
      Cancel: 'Cancel'
    }
  };
  const euSample = {
    translations: {
      Settings: 'Configuración',
      Save: 'Enregistrer',
      Appearance: 'Darstellung',
      SameWord: 'SameWord'
    }
  };
  const resEs = validateAndFilterTranslations(euSample, 'es');
  assert.equal(resEs.accepted && Object.keys(resEs.accepted).length, 3);
  assert.equal(resEs.rejected.length, 1);

  const ruSample = {
    translations: {
      Settings: 'Настройки',
      Appearance: 'Внешний вид',
      EnglishOnly: 'Settings'
    }
  };
  const resRu = validateAndFilterTranslations(ruSample, 'ru');
  assert.deepEqual(resRu.accepted, { Settings: 'Настройки', Appearance: 'Внешний вид' });
  assert.equal(resRu.rejected.length, 1);
});

test('macOS & Linux BSD ps etime parser and spaced .app bundle path parser work accurately', () => {
  assert.equal(parsePosixElapsedSeconds('00:08'), 8);
  assert.equal(parsePosixElapsedSeconds('02:15'), 135);
  assert.equal(parsePosixElapsedSeconds('01:02:03'), 3723);
  assert.equal(parsePosixElapsedSeconds('2-00:00:10'), 172810);

  const macStable = parsePosixHostProcessRow(
    '  4812   00:05 /Applications/Antigravity.app/Contents/MacOS/Antigravity --updated',
    'darwin'
  );
  assert.equal(macStable.channel, 'stable');
  assert.equal(macStable.appBundle, '/Applications/Antigravity.app');
  assert.equal(macStable.ageSec, 5);
  assert.equal(macStable.hasCdpFlag, false);
  assert.equal(macStable.hasUpdatedFlag, true);

  const macInsiders = parsePosixHostProcessRow(
    '  9104   00:14 /Applications/Antigravity - Insiders.app/Contents/MacOS/Antigravity - Insiders --remote-debugging-port=0',
    'darwin'
  );
  assert.equal(macInsiders.channel, 'insiders');
  assert.equal(macInsiders.appBundle, '/Applications/Antigravity - Insiders.app');
  assert.equal(macInsiders.hasCdpFlag, true);

  const macHelper = parsePosixHostProcessRow(
    '  9120   00:14 /Applications/Antigravity.app/Contents/Frameworks/Antigravity Helper (Renderer).app/Contents/MacOS/Antigravity Helper (Renderer) --type=renderer',
    'darwin'
  );
  assert.equal(macHelper, null);

  if (process.platform === 'darwin' || process.platform === 'linux') {
    const psReal = spawnSync('ps', ['-axo', 'pid=,etime=,command='], { encoding: 'utf8', timeout: 3000 });
    assert.equal(psReal.status, 0, 'ps -axo pid=,etime=,command= must succeed on macOS and Linux');
  }
});

test('macOS LaunchAgent plist & pure-shell .app Dock wrapper generate cleanly (validated via plutil on macOS)', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agzh-mac-test-'));
  try {
    const plistPath = configureAutostart(true, { skipSystemCommands: true, customHome: tmpHome });
    assert.ok(fs.existsSync(plistPath));

    const appsDir = path.join(tmpHome, 'Applications');
    const createdApps = installMacShellLaunchers(
      [
        { channel: 'stable', appBundle: '/Applications/Antigravity.app' },
        { channel: 'insiders', appBundle: '/Applications/Antigravity - Insiders.app' }
      ],
      appsDir
    );
    assert.equal(createdApps.length, 2);

    const launchSh = fs.readFileSync(path.join(createdApps[1], 'Contents', 'MacOS', 'launch'), 'utf8');
    assert.ok(launchSh.startsWith('#!/bin/sh'));
    assert.ok(launchSh.includes('"/Applications/Antigravity - Insiders.app" --args --remote-debugging-port=0'));

    if (process.platform === 'darwin') {
      const lint1 = spawnSync('/usr/bin/plutil', ['-lint', plistPath], { encoding: 'utf8' });
      assert.equal(lint1.status, 0, `LaunchAgent plist failed plutil validation: ${lint1.stdout} ${lint1.stderr}`);
      const lint2 = spawnSync('/usr/bin/plutil', ['-lint', path.join(createdApps[0], 'Contents', 'Info.plist')], {
        encoding: 'utf8'
      });
      assert.equal(lint2.status, 0, `Wrapper Info.plist failed plutil validation: ${lint2.stdout} ${lint2.stderr}`);
    }

    removeMacShellLaunchers(appsDir);
    configureAutostart(false, { skipSystemCommands: true, customHome: tmpHome });
    assert.equal(fs.existsSync(plistPath), false);
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('Per-locale learned dictionary writes strictly to dict/learned.<locale>.json and supports English reset', () => {
  assert.equal(LOCALE_MENU_OPTIONS.length, 16);
  const jaLearned = resolveLocaleFiles('ja').learnedDict;
  const backupJa = fs.existsSync(jaLearned) ? fs.readFileSync(jaLearned, 'utf8') : '';
  const hadConfig = fs.existsSync(FILES.config);
  const backupConfig = hadConfig ? fs.readFileSync(FILES.config, 'utf8') : '';
  try {
    writeConfigFile({ locale: 'ja' });
    const builder = createPayloadBuilder();
    const first = builder.refreshIfNeeded();
    assert.ok(first.buildId.startsWith('agi18n-ja-'));

    const res = saveLearnedTranslations({ 'Dynamic Test Label': '動的テストラベル' }, 'ja');
    assert.equal(res.addedCount, 1);

    const second = builder.refreshIfNeeded();
    assert.equal(second.changed, true);
    assert.notEqual(second.buildId, first.buildId);

    writeConfigFile({ locale: 'en' });
    const enState = builder.refreshIfNeeded();
    assert.equal(enState.config.enabled, false);
    assert.equal(enState.dictCount, 0);
  } finally {
    if (hadConfig) fs.writeFileSync(FILES.config, backupConfig, 'utf8');
    else if (fs.existsSync(FILES.config)) fs.unlinkSync(FILES.config);
    if (backupJa) fs.writeFileSync(jaLearned, backupJa, 'utf8');
    else if (fs.existsSync(jaLearned)) fs.unlinkSync(jaLearned);
  }
});

test('English mode (enabled: false) mounts MutationObserver without WHATWG attributeFilter TypeError and renders Appearance dropdown dynamically', async () => {
  const vm = await import('node:vm');
  const injectorSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'injector.js'), 'utf8');

  let observerCallback = null;
  let observedOptions = null;

  class StrictMutationObserver {
    constructor(cb) {
      this.cb = cb;
    }
    observe(target, options = {}) {
      // WHATWG DOM Standard check enforced by Chromium V8:
      if ('attributeFilter' in options && options.attributes === false) {
        throw new TypeError(
          "Failed to execute 'observe' on 'MutationObserver': The options object may only set 'attributeFilter' when 'attributes' is true or not present."
        );
      }
      observedOptions = options;
      observerCallback = this.cb;
    }
    disconnect() {
      observerCallback = null;
    }
  }

  const elementsById = new Map();
  let agyCards = [];
  let h2List = [];

  function makeFakeElement(tag) {
    const el = {
      nodeType: 1,
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      style: {},
      attributes: new Map(),
      children: [],
      parentElement: null,
      firstChild: null,
      isConnected: true,
      setAttribute(k, v) {
        this.attributes.set(k, String(v));
        if (k === 'id') elementsById.set(String(v), this);
      },
      getAttribute(k) {
        return this.attributes.has(k) ? this.attributes.get(k) : null;
      },
      removeAttribute(k) {
        this.attributes.delete(k);
      },
      appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        this.firstChild = this.children[0] || null;
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      insertBefore(child, ref) {
        child.parentElement = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.unshift(child);
        this.firstChild = this.children[0] || null;
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      remove() {
        if (this.id) elementsById.delete(this.id);
      },
      addEventListener() {},
      removeEventListener() {},
      closest(sel) {
        if (sel === '.space-y-2') return this._spaceY2 || null;
        if (sel === '.max-w-2xl') return this._maxW2xl || null;
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    };
    Object.defineProperty(el, 'innerHTML', {
      get() {
        return '';
      },
      set(v) {
        if (v === '') {
          this.children = [];
          this.firstChild = null;
        }
      }
    });
    return el;
  }

  const fakeBody = makeFakeElement('body');
  const fakeHead = makeFakeElement('head');
  const fakeDoc = {
    hidden: false,
    title: 'Antigravity',
    body: fakeBody,
    head: fakeHead,
    createElement: (t) => makeFakeElement(t),
    createElementNS: (_ns, t) => makeFakeElement(t),
    getElementById: (id) => elementsById.get(id) || null,
    querySelectorAll: (sel) => (sel === '.agy-card' ? agyCards : sel === 'h2' ? h2List : []),
    createTreeWalker: (root) => {
      let yielded = false;
      return {
        currentNode: null,
        nextNode() {
          if (!yielded && root && root._h3Text) {
            yielded = true;
            this.currentNode = { nodeType: 3, nodeValue: root._h3Text };
            return this.currentNode;
          }
          return null;
        }
      };
    },
    addEventListener() {},
    removeEventListener() {}
  };

  const sandbox = {
    window: null,
    document: fakeDoc,
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    MutationObserver: StrictMutationObserver,
    WeakMap,
    Set,
    Map,
    requestAnimationFrame: (fn) => {
      fn();
      return 0;
    },
    cancelAnimationFrame: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  sandbox.window = sandbox;
  sandbox.window.top = sandbox.window;
  sandbox.window.location = { protocol: 'https:', href: 'https://127.0.0.1:60252/?project=outside-of-project' };

  vm.runInNewContext(injectorSrc, sandbox);
  assert.equal(typeof sandbox.window.__AGI18N_BOOT__, 'function');

  // Boot in English mode (enabled: false) BEFORE Settings modal is opened
  sandbox.window.__AGI18N_BOOT__({
    buildId: 'agi18n-en-test',
    locale: 'en',
    enabled: false,
    localeOptions: LOCALE_MENU_OPTIONS,
    dict: {}
  });

  assert.ok(observerCallback, 'MutationObserver must remain active in English mode without throwing TypeError');
  assert.equal('attributeFilter' in observedOptions, false);
  assert.equal(elementsById.has('agi18n-language-row'), false);

  // Simulate user opening Settings -> Appearance modal dynamically
  const fakeH3 = { _h3Text: 'Appearance' };
  const fakeCard = makeFakeElement('div');
  fakeCard._spaceY2 = {
    querySelector: (s) => (s === 'h3' ? fakeH3 : null)
  };
  agyCards = [fakeCard];

  observerCallback([{ type: 'childList', addedNodes: [fakeCard] }]);

  assert.equal(elementsById.has('agi18n-language-row'), true, 'Display Language row must mount dynamically in English mode');
  assert.equal(elementsById.has('agi18n-language-trigger'), true);

  // Simulate Antigravity IDE standalone settings (<h2> Appearance without Theme .agy-card)
  elementsById.clear();
  agyCards = [];
  const ideSectionsWrap = makeFakeElement('div');
  const idePanel = makeFakeElement('div');
  idePanel.children = [makeFakeElement('div'), ideSectionsWrap];
  const fakeIdeH2 = makeFakeElement('h2');
  fakeIdeH2._h3Text = 'Appearance';
  fakeIdeH2._maxW2xl = idePanel;
  h2List = [fakeIdeH2];

  observerCallback([{ type: 'childList', addedNodes: [fakeIdeH2] }]);
  assert.equal(elementsById.has('agi18n-ide-appearance-card'), true, 'IDE standalone settings must create Appearance card');
  assert.equal(elementsById.has('agi18n-language-row'), true, 'Display Language row must mount inside IDE Appearance card');
});

test('Security & transparency gates: GPL-3.0 license, default-off telemetry/AI sync, and zero force-kill in relauncher', () => {
  assert.equal(DEFAULT_CONFIG.collectUntranslated, false);
  assert.equal(DEFAULT_CONFIG.autoSyncAi, false);

  const pkg = readJsonFile(path.join(PROJECT_ROOT, 'package.json'), {});
  assert.equal(pkg.license, 'GPL-3.0-only');

  const licenseText = fs.readFileSync(path.join(PROJECT_ROOT, 'LICENSE'), 'utf8');
  assert.ok(licenseText.includes('GNU GENERAL PUBLIC LICENSE'));
  assert.ok(licenseText.includes('Version 3, 29 June 2007'));
  assert.ok(licenseText.split(/\r?\n/).length >= 600, 'LICENSE must preserve multi-line formatting for GitHub Licensee detection');

  const relaunchSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'relaunch.mjs'), 'utf8');
  assert.equal(/-Force\b|SIGKILL\b|taskkill\s+\/F/i.test(relaunchSrc), false, 'relaunch.mjs must never force-kill user processes');

  const cliSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'cli.mjs'), 'utf8');
  assert.ok(cliSrc.includes("'--mode', 'plan', '--sandbox'"), 'sync-ai must enforce plan mode and sandbox isolation');
  assert.ok(cliSrc.includes("args.includes('--with-skill')"), 'SKILL.md installation must be strictly opt-in');
});

test('Chinese Insiders dynamic patterns, multi-word case fallback & React text-node reuse cleanup work accurately', async () => {
  const vm = await import('node:vm');
  const { getLocaleSpec } = await import('../src/locales.mjs');
  const injectorSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'injector.js'), 'utf8');

  let observerCb = null;
  class MockObserver {
    constructor(cb) {
      observerCb = cb;
    }
    observe() {}
    disconnect() {}
  }

  const textNode = {
    nodeType: 3,
    isConnected: true,
    nodeValue: 'Thinking',
    parentElement: { nodeType: 1, tagName: 'SPAN', isConnected: true, closest: () => null }
  };
  const btnEl = {
    nodeType: 1,
    tagName: 'BUTTON',
    isConnected: true,
    attrs: new Map([
      ['aria-label', 'toggle sidebar'],
      ['title', 'Shortcut Ctrl+N for New Conversation']
    ]),
    getAttribute(k) {
      return this.attrs.has(k) ? this.attrs.get(k) : null;
    },
    setAttribute(k, v) {
      this.attrs.set(k, String(v));
    },
    removeAttribute(k) {
      this.attrs.delete(k);
    },
    closest() {
      return null;
    }
  };
  const tokenNode = { nodeType: 3, nodeValue: 'Mcp Tools: 1,568 tokens', parentElement: btnEl };
  const breakdownNode = { nodeType: 3, nodeValue: 'Show 31 breakdowns', parentElement: btnEl };
  const lockedEl = {
    nodeType: 1,
    tagName: 'BUTTON',
    isConnected: true,
    attrs: new Map([['aria-label', 'Model: Gemini 4 Carbon High, Model cannot be changed while the agent is running']]),
    getAttribute(k) {
      return this.attrs.has(k) ? this.attrs.get(k) : null;
    },
    setAttribute(k, v) {
      this.attrs.set(k, String(v));
    },
    removeAttribute(k) {
      this.attrs.delete(k);
    },
    closest() {
      return null;
    }
  };

  const allNodes = [btnEl, lockedEl, textNode, tokenNode, breakdownNode];
  const fakeBody = {
    nodeType: 1,
    tagName: 'BODY',
    isConnected: true,
    closest: () => null,
    getAttribute: () => null,
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelectorAll: () => []
  };

  const sandbox = {
    window: null,
    document: {
      hidden: false,
      title: 'Antigravity Insiders',
      body: fakeBody,
      head: fakeBody,
      getElementById: () => null,
      querySelectorAll: () => [],
      createTreeWalker: (_root, _what, filter) => {
        let idx = 0;
        return {
          currentNode: null,
          nextNode() {
            while (idx < allNodes.length) {
              const candidate = allNodes[idx++];
              const verdict = filter && typeof filter.acceptNode === 'function' ? filter.acceptNode(candidate) : 1;
              if (verdict === 1) {
                this.currentNode = candidate;
                return candidate;
              }
            }
            return null;
          }
        };
      },
      addEventListener() {},
      removeEventListener() {}
    },
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    MutationObserver: MockObserver,
    WeakMap,
    Set,
    Map,
    requestAnimationFrame: (fn) => {
      fn();
      return 0;
    },
    cancelAnimationFrame: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {}
  };
  sandbox.window = sandbox;
  sandbox.window.top = sandbox.window;
  sandbox.window.location = { protocol: 'https:', href: 'https://127.0.0.1:59678/' };

  vm.runInNewContext(injectorSrc, sandbox);
  const sgSpec = getLocaleSpec('zh-SG');
  const sgDict = loadMergedDictionary('zh-SG').merged;

  sandbox.window.__AGI18N_BOOT__({
    buildId: 'agi18n-zh-SG-test',
    locale: 'zh-SG',
    enabled: true,
    collectUntranslated: true,
    localeOptions: LOCALE_MENU_OPTIONS,
    contextOverrides: sgSpec.contextOverrides,
    patterns: sgSpec.patterns,
    dict: sgDict
  });

  assert.equal(textNode.nodeValue, '正在思考');
  assert.equal(tokenNode.nodeValue, 'MCP 工具：1,568 Token');
  assert.equal(breakdownNode.nodeValue, '展开 31 项明细');
  assert.equal(btnEl.getAttribute('aria-label'), '切换侧边栏');
  assert.equal(btnEl.getAttribute('title'), '「新建对话」的快捷键：Ctrl+N');
  assert.equal(lockedEl.getAttribute('aria-label'), '模型：Gemini 4 Carbon High（Agent 运行期间无法切换模型）');

  // Simulate React reusing textNode for an untranslated dynamic string vs Running task
  textNode.nodeValue = 'Running 检查预览版状态';
  observerCb([{ type: 'characterData', target: textNode }]);
  assert.equal(textNode.nodeValue, '正在运行：检查预览版状态');

  // Simulate dynamic home greeting & marketplace action rules
  textNode.nodeValue = 'Hi Alex, what can we get done today?';
  observerCb([{ type: 'characterData', target: textNode }]);
  assert.equal(textNode.nodeValue, '嗨，Alex，今天想推进点什么？');

  textNode.nodeValue = 'Install GitHub';
  observerCb([{ type: 'characterData', target: textNode }]);
  assert.equal(textNode.nodeValue, '安装 GitHub');

  // Simulate React reusing textNode for an untranslated plain string -> textOrigMap must be cleared
  textNode.nodeValue = 'Completely Unknown Custom Phrase';
  observerCb([{ type: 'characterData', target: textNode }]);
  assert.equal(sandbox.window.__AGI18N_RUNTIME__.textOrigMap.has(textNode), false);
});

test('Opt-in AI thinking/reply language sync defaults to false, switches cleanly, and preserves user rules', () => {
  assert.equal(DEFAULT_CONFIG.syncAiOutputLang, false);
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agi18n-airule-'));
  try {
    const rulesDir = path.join(tmpHome, '.gemini', 'config', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const userRule = path.join(rulesDir, '01_user_custom.md');
    fs.writeFileSync(userRule, '# User Custom Rule\n', 'utf8');

    // Default off -> writes nothing
    assert.equal(syncAgentLanguageRule('ja', false, { customHome: tmpHome }), '');
    assert.equal(fs.existsSync(path.join(rulesDir, AI_LANG_RULE_FILENAME)), false);

    // Enabled for Japanese -> writes Japanese rule
    const jaPath = syncAgentLanguageRule('ja', true, { customHome: tmpHome });
    assert.ok(jaPath.endsWith(AI_LANG_RULE_FILENAME));
    assert.ok(fs.readFileSync(jaPath, 'utf8').includes('日本語'));

    // Switch to Russian -> updates rule in place
    syncAgentLanguageRule('ru', true, { customHome: tmpHome });
    assert.ok(fs.readFileSync(jaPath, 'utf8').includes('русском языке'));

    // Switch to English or turn off -> removes managed rule while preserving user rule
    assert.equal(syncAgentLanguageRule('en', true, { customHome: tmpHome }), '');
    assert.equal(fs.existsSync(jaPath), false);
    assert.equal(fs.existsSync(userRule), true);
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('2-in-1 Antigravity IDE channel discovery, JSONC argv.json patching & languagepacks.json registry work cleanly', () => {
  const channels = resolveActiveChannels('auto').map((c) => c.channel);
  assert.deepEqual(channels, ['stable', 'insiders', 'ide']);

  const macIde = parsePosixHostProcessRow(
    '  7210   00:09 /Applications/Antigravity IDE.app/Contents/MacOS/Electron --remote-debugging-port=0',
    'darwin'
  );
  assert.equal(macIde.channel, 'ide');
  assert.equal(macIde.appBundle, '/Applications/Antigravity IDE.app');
  assert.equal(macIde.hasCdpFlag, true);

  const linuxIde = parsePosixHostProcessRow('  8312   00:12 /usr/bin/antigravity-ide', 'linux');
  assert.equal(linuxIde.channel, 'ide');
  assert.equal(linuxIde.hasCdpFlag, false);

  const rawArgv = [
    '// VS Code runtime arguments',
    '{',
    '\t"enable-crash-reporter": true,',
    '\t// Do not edit crash id',
    '\t"crash-reporter-id": "abc-123"',
    '}'
  ].join('\n');
  const patchedZh = patchVscodeArgvJsonc(rawArgv, 'zh-cn');
  assert.ok(patchedZh.includes('// VS Code runtime arguments'));
  assert.ok(patchedZh.includes('"crash-reporter-id": "abc-123",'));
  assert.ok(patchedZh.includes('"locale": "zh-cn"'));

  const patchedRu = patchVscodeArgvJsonc(patchedZh, 'ru');
  assert.ok(patchedRu.includes('"locale": "ru"'));
  assert.equal(patchedRu.includes('"locale": "zh-cn"'), false);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agi18n-ide-reg-'));
  try {
    const userDataDir = path.join(tmpDir, 'userData');
    const extRoot = path.join(tmpDir, 'extensions');
    const extDir = path.join(extRoot, 'ms-ceintl.vscode-language-pack-zh-hans-1.106.0-universal');
    const transDir = path.join(extDir, 'translations');
    fs.mkdirSync(transDir, { recursive: true });
    fs.writeFileSync(path.join(transDir, 'main.i18n.json'), '{"contents":{}}', 'utf8');
    fs.writeFileSync(
      path.join(extDir, 'package.json'),
      JSON.stringify({
        name: 'vscode-language-pack-zh-hans',
        publisher: 'MS-CEINTL',
        version: '1.106.0',
        contributes: {
          localizations: [
            {
              languageId: 'zh-cn',
              localizedLanguageName: '中文(简体)',
              translations: [{ id: 'vscode', path: './translations/main.i18n.json' }]
            }
          ]
        }
      }),
      'utf8'
    );

    const ok = ensureIdeLanguagePacksRegistry(userDataDir, extRoot, 'MS-CEINTL.vscode-language-pack-zh-hans');
    assert.equal(ok, true);
    const reg = JSON.parse(fs.readFileSync(path.join(userDataDir, 'languagepacks.json'), 'utf8'));
    assert.equal(typeof reg['zh-cn']?.hash, 'string');
    assert.ok(reg['zh-cn'].translations.vscode.endsWith('main.i18n.json'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('install.ps1 & install.sh remain pure ASCII/clean and detect existing Node >= 22.13 without triggering fallback download (Issue #1)', () => {
  const ps1Path = path.join(PROJECT_ROOT, 'install.ps1');
  const shPath = path.join(PROJECT_ROOT, 'install.sh');
  const ps1Text = fs.readFileSync(ps1Path, 'utf8');
  const shText = fs.readFileSync(shPath, 'utf8');

  assert.equal(/[^\x00-\x7F]/.test(ps1Text), false, 'install.ps1 must stay strictly ASCII');
  assert.equal(ps1Text.includes('Start-Process -FilePath $NodeExe -ArgumentList'), false);
  assert.ok(shText.includes('Setting up repository in $DEFAULT_INSTALL_DIR ..." >&2'));

  if (process.platform === 'win32') {
    const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'agi18n-ps1-'));
    try {
      const cmd = [
        '$env:AGY_INSTALLER_IMPORT_ONLY = "1"',
        `. '${ps1Path.replace(/'/g, "''")}'`,
        `$ok = Test-NodeVersionOk '${process.execPath.replace(/'/g, "''")}'`,
        `$resolved = Resolve-NodeBinary '${tmpRepo.replace(/'/g, "''")}'`,
        'Write-Output ("OK=" + $ok + ";RESOLVED=" + $resolved)'
      ].join('; ');
      const run = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', cmd], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 8000
      });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      assert.match(run.stdout, /OK=True;RESOLVED=.+node\.exe/i);
      assert.equal(fs.existsSync(path.join(tmpRepo, '.runtime')), false, 'Must not create .runtime when system Node >= 22.13 exists');
    } finally {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    }
  }
});

test('Relaunch preserves custom CLI flags (--proxy-server, workspace paths), Automator proxy env vars, and Windows Taskbar pinned shortcuts', () => {
  const macAutomator = parsePosixHostProcessRow(
    '  5120   00:04 /Applications/Antigravity.app/Contents/MacOS/Antigravity -psn_0_12345 --proxy-server="http://127.0.0.1:7890" "/Users/dev/My Project" --updated',
    'darwin'
  );
  assert.equal(macAutomator.channel, 'stable');
  assert.deepEqual(macAutomator.extraArgs, ['--proxy-server=http://127.0.0.1:7890', '/Users/dev/My Project']);

  const linuxCustom = parsePosixHostProcessRow(
    '  6220   00:03 /usr/bin/antigravity-insiders --proxy-bypass-list=localhost,127.0.0.1 /home/dev/repo',
    'linux'
  );
  assert.equal(linuxCustom.channel, 'insiders');
  assert.deepEqual(linuxCustom.extraArgs, ['--proxy-bypass-list=localhost,127.0.0.1', '/home/dev/repo']);

  const winArgs = extractWinCommandTail(
    '"C:\\Users\\LI\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe" --proxy-server=socks5://127.0.0.1:1080 "D:\\Code\\Demo App"',
    'C:\\Users\\LI\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe'
  );
  assert.deepEqual(winArgs, ['--proxy-server=socks5://127.0.0.1:1080', 'D:\\Code\\Demo App']);

  assert.deepEqual(splitCommandArgs('--remote-debugging-port=9222 --flag=1'), ['--flag=1']);

  const macPsEww =
    '/Applications/Antigravity.app/Contents/MacOS/Antigravity PATH=/usr/bin:/bin http_proxy=http://127.0.0.1:7890 https_proxy=http://127.0.0.1:7890 ALL_PROXY=socks5://127.0.0.1:7891 no_proxy=localhost,127.0.0.1 HOME=/Users/dev SECRET_TOKEN=should_not_copy';
  assert.deepEqual(extractProxyEnvFromText(macPsEww, 'space'), {
    http_proxy: 'http://127.0.0.1:7890',
    https_proxy: 'http://127.0.0.1:7890',
    ALL_PROXY: 'socks5://127.0.0.1:7891',
    no_proxy: 'localhost,127.0.0.1'
  });

  const linuxEnviron = [
    'USER=dev',
    'HTTP_PROXY=http://127.0.0.1:8080',
    'HTTPS_PROXY=http://127.0.0.1:8080',
    'API_KEY=ignore_me'
  ].join('\0');
  assert.deepEqual(extractProxyEnvFromText(linuxEnviron, 'nul'), {
    HTTP_PROXY: 'http://127.0.0.1:8080',
    HTTPS_PROXY: 'http://127.0.0.1:8080'
  });

  const relaunchSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'relaunch.mjs'), 'utf8');
  assert.ok(
    relaunchSrc.includes('User Pinned\\\\TaskBar'),
    'Windows shortcut scanner must include pinned Taskbar shortcuts'
  );
});

test('On-demand Electron native context menu hook translates multi-level items, protects custom names, and keeps Array.prototype.map untouched at rest', async () => {
  const vm = await import('node:vm');
  const injectorSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'injector.js'), 'utf8');
  const hadConfig = fs.existsSync(FILES.config);
  const backupConfig = hadConfig ? fs.readFileSync(FILES.config, 'utf8') : '';
  const builder = createPayloadBuilder();
  writeConfigFile({ locale: 'zh-CN', enabled: true });
  const zhSpec = SUPPORTED_LOCALES['zh-CN'];
  const { merged } = loadMergedDictionary('zh-CN');

  const winListeners = new Map();
  let pendingTimerFn = null;

  const fakeBody = {
    nodeType: 1,
    tagName: 'BODY',
    isConnected: true,
    closest: () => null,
    getAttribute: () => null,
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const fakeDoc = {
    hidden: false,
    title: 'Antigravity',
    body: fakeBody,
    head: { appendChild: () => {} },
    createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, remove: () => {} }),
    getElementById: () => null,
    querySelectorAll: () => [],
    createTreeWalker: () => ({ currentNode: null, nextNode: () => null }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const sandbox = {
    window: null,
    document: fakeDoc,
    Array,
    Object,
    WeakMap,
    WeakSet,
    Set,
    Map,
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setTimeout: (fn) => {
      pendingTimerFn = fn;
      return 99;
    },
    clearTimeout: () => {
      pendingTimerFn = null;
    }
  };

  sandbox.window = {
    top: null,
    location: { protocol: 'https:', hostname: '127.0.0.1', href: 'https://127.0.0.1:53454/' },
    electronNative: Object.freeze({ showContextMenu: () => Promise.resolve(null) }),
    addEventListener: (type, fn) => winListeners.set(type, fn),
    removeEventListener: (type) => winListeners.delete(type)
  };
  sandbox.window.top = sandbox.window;

  const nativeMapBefore = Array.prototype.map;
  try {
    vm.runInNewContext(injectorSrc, sandbox);
    sandbox.window.__AGI18N_BOOT__({
      buildId: builder.refreshIfNeeded().buildId,
      locale: 'zh-CN',
      enabled: true,
      dict: merged,
      contextOverrides: zhSpec.contextOverrides,
      patterns: zhSpec.patterns,
      localeOptions: LOCALE_MENU_OPTIONS
    });

    const rt = sandbox.window.__AGI18N_RUNTIME__;
    assert.equal(rt.isNativeMenuHookArmed(), false);
    assert.equal(Array.prototype.map, nativeMapBefore, 'Array.prototype.map must stay untouched at rest');

    // Trigger right-click capture listener
    const ctxHandler = winListeners.get('contextmenu');
    assert.equal(typeof ctxHandler, 'function');
    ctxHandler({ type: 'contextmenu', button: 2 });
    assert.equal(rt.isNativeMenuHookArmed(), true);
    assert.equal(Object.prototype.propertyIsEnumerable.call(Array.prototype, 'map'), false);

    // Simulate Antigravity's native menu builder (Cjb .map with nested submenu)
    const rawItems = [
      { id: 'pin', label: 'Pin', accelerator: '' },
      { type: 'separator' },
      { id: 'fork', label: 'Fork in Current Workspace', accelerator: '' },
      { id: 'open-side', label: 'Side Panel (Default)', accelerator: '' },
      {
        id: 'move-proj',
        label: 'Move to Project',
        accelerator: '',
        items: [
          { id: 'project-user-share', label: 'Share', accelerator: '' },
          { id: 'project-new', label: 'New Project...', accelerator: '' },
          { id: 'group-active', label: 'Active', accelerator: '' },
          { id: 'move-grp', label: 'Move to Group: CoreTeam', accelerator: '' }
        ]
      }
    ];

    function buildMenu(list) {
      return list.map((d) => {
        if (d.type === 'separator') return { type: 'separator' };
        const entry = {
          id: d.id,
          label: d.label,
          type: 'normal',
          checked: false,
          disabled: false,
          accelerator: d.accelerator
        };
        if (d.items) entry.submenu = buildMenu(d.items);
        return entry;
      });
    }

    const built = buildMenu(rawItems);
    assert.equal(built[0].label, '置顶');
    assert.equal(built[2].label, '在当前工作区中分叉');
    assert.equal(built[3].label, '右侧边栏（默认）');
    assert.equal(built[4].label, '移至项目');
    assert.equal(built[4].submenu[0].label, 'Share', 'User project name "Share" must not be translated');
    assert.equal(built[4].submenu[1].label, '新建项目...');
    assert.equal(built[4].submenu[2].label, 'Active', 'User group name "Active" must not be translated');
    assert.equal(built[4].submenu[3].label, '移至分组：CoreTeam');

    // Auto-disarm after 160ms timeout restores native Array.prototype.map
    assert.equal(typeof pendingTimerFn, 'function');
    pendingTimerFn();
    assert.equal(rt.isNativeMenuHookArmed(), false);
    assert.equal(Array.prototype.map, nativeMapBefore, 'Array.prototype.map must restore automatically after window expires');

    rt.teardown(true);
    assert.equal(winListeners.has('contextmenu'), false);
  } finally {
    if (hadConfig) fs.writeFileSync(FILES.config, backupConfig, 'utf8');
    else if (fs.existsSync(FILES.config)) fs.unlinkSync(FILES.config);
    Object.defineProperty(Array.prototype, 'map', {
      value: nativeMapBefore,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }
});

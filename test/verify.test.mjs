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
  FILES,
  PROJECT_ROOT,
  createPayloadBuilder,
  loadMergedDictionary,
  readJsonFile,
  resolveLocaleFiles,
  writeConfigFile
} from '../src/paths.mjs';
import { parsePosixElapsedSeconds, parsePosixHostProcessRow } from '../src/relaunch.mjs';
import { configureAutostart, installMacShellLaunchers, removeMacShellLaunchers } from '../src/service.mjs';
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

test('All 14 supported locales have full dictionaries and prompt specs', () => {
  assert.equal(Object.keys(SUPPORTED_LOCALES).length, 14);
  const zhKeys = Object.keys(loadMergedDictionary('zh-CN').merged);
  assert.ok(zhKeys.length >= 1910, `Expected >= 1910 zh-CN keys, got ${zhKeys.length}`);

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
  assert.equal(Object.keys(resEs.accepted).length, 3);
  assert.equal(resEs.rejected.length, 1);
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
  assert.equal(LOCALE_MENU_OPTIONS.length, 15);
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
    querySelectorAll: (sel) => (sel === '.agy-card' ? agyCards : []),
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
      return 1;
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
});

/**
 * src/daemon.mjs — Low-CPU local DevTools WebSocket synchronizer with instant UI locale binding
 */
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  DICT_DIR,
  PROJECT_ROOT,
  createPayloadBuilder,
  readDevToolsPort,
  readJsonFile,
  resolveActiveChannels,
  writeConfigFile
} from './paths.mjs';
import { createRelaunchMonitor } from './relaunch.mjs';
import { PID_LOCK_FILE, readDaemonPid, syncAgentLanguageRule, syncIdeDisplayLanguage } from './service.mjs';

const SYNC_INTERVAL_MS = 4000;
const DISCOVERY_INTERVAL_MS = 4000;
const AUTO_AI_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const AUTO_AI_STATE_FILE = path.join(os.tmpdir(), 'antigravity-langpack-autosync.json');
const BINDING_NAME = '__agi18n_switch_locale';

export async function fetchDevToolsPages(port) {
  if (!port) return [];
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: AbortSignal.timeout(1500)
    });
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.filter((item) => {
      if (!item?.id || !item?.webSocketDebuggerUrl) return false;
      const url = String(item.url || '');
      if (url.startsWith('devtools://') || url.startsWith('data:') || url.startsWith('about:')) return false;
      if (String(item.title || '').includes('Launchpad')) return false;
      if (item.type === 'iframe' || item.type === 'webview') {
        return (
          url.startsWith('plugin://swarm--') ||
          /^https?:\/\/(?:127\.0\.0\.1|localhost):\d+\//i.test(url) ||
          url.startsWith('vscode-webview://')
        );
      }
      return item.type === 'page';
    });
  } catch {
    return [];
  }
}

export function evaluateOnTarget(wsUrl, expression, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), timeoutMs);
    try {
      const ws = new WebSocket(wsUrl);
      ws.addEventListener('open', () => {
        ws.send(
          JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: { expression, returnByValue: true, awaitPromise: false }
          })
        );
      });
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.id === 1) {
            clearTimeout(timer);
            ws.close();
            if (msg.error || msg.result?.exceptionDetails) {
              finish({ ok: false, error: msg.error?.message || 'eval_exception' });
            } else {
              finish({ ok: true, value: msg.result?.result?.value });
            }
          }
        } catch {}
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        finish({ ok: false, error: 'ws_error' });
      });
      ws.addEventListener('close', () => {
        clearTimeout(timer);
        finish({ ok: false, error: 'ws_closed' });
      });
    } catch (err) {
      clearTimeout(timer);
      finish({ ok: false, error: err?.message || 'ws_init_error' });
    }
  });
}

function createPersistentSession(target, channelInfo, getScriptState, onLocaleRequested, onSubTargetCreated) {
  return new Promise((resolveConn) => {
    let resolved = false;
    const complete = (entry) => {
      if (!resolved) {
        resolved = true;
        resolveConn(entry);
      }
    };
    const openTimer = setTimeout(() => complete(null), 2500);

    try {
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      let seq = 1;
      let docScriptId = '';
      let isWorkbench = target.type === 'iframe' || target.type === 'webview';
      const callbacks = new Map();

      const callCdp = (method, params = {}) =>
        new Promise((res) => {
          if (ws.readyState !== WebSocket.OPEN) return res(null);
          const id = seq++;
          const t = setTimeout(() => {
            callbacks.delete(id);
            res(null);
          }, 2200);
          callbacks.set(id, (payload) => {
            clearTimeout(t);
            res(payload);
          });
          try {
            ws.send(JSON.stringify({ id, method, params }));
          } catch {
            clearTimeout(t);
            callbacks.delete(id);
            res(null);
          }
        });

      const applyBundle = async () => {
        if (!isWorkbench) return false;
        const { script } = getScriptState();
        if (docScriptId) {
          await callCdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: docScriptId });
          docScriptId = '';
        }
        const added = await callCdp('Page.addScriptToEvaluateOnNewDocument', { source: script });
        if (added?.result?.identifier) docScriptId = added.result.identifier;
        const evalRes = await callCdp('Runtime.evaluate', { expression: script, returnByValue: true });
        return Boolean(evalRes && !evalRes.error && !evalRes.result?.exceptionDetails);
      };

      const ensureMounted = async () => {
        if (!isWorkbench) return;
        const { buildId } = getScriptState();
        const probe = await callCdp('Runtime.evaluate', {
          expression: '({ b: window.__AGI18N_RUNTIME__ ? window.__AGI18N_RUNTIME__.buildId : "", p: window.__AGI18N_PENDING_LOCALE__ || "" })',
          returnByValue: true
        });
        const val = probe?.result?.result?.value;
        if (val?.p) {
          await callCdp('Runtime.evaluate', { expression: 'window.__AGI18N_PENDING_LOCALE__ = ""' });
          onLocaleRequested?.(val.p);
          return;
        }
        if (val?.b !== buildId) {
          await applyBundle();
        }
      };

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.id && callbacks.has(msg.id)) {
            const fn = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            fn(msg);
          } else if (msg.method === 'Runtime.bindingCalled' && msg.params?.name === BINDING_NAME) {
            const requested = String(msg.params.payload || '').trim();
            if (requested) onLocaleRequested?.(requested);
          } else if (msg.method === 'Page.frameNavigated' && !msg.params?.frame?.parentId) {
            setTimeout(() => ensureMounted().catch(() => {}), 150);
          } else if (
            msg.method === 'Target.targetCreated' &&
            (msg.params?.targetInfo?.type === 'iframe' || msg.params?.targetInfo?.type === 'webview')
          ) {
            onSubTargetCreated?.();
          }
        } catch {}
      });

      const sessionObj = {
        id: target.id,
        channel: channelInfo.channel,
        targetUrl: target.webSocketDebuggerUrl,
        close() {
          try {
            ws.close();
          } catch {}
        },
        applyBundle,
        ensureMounted
      };

      ws.addEventListener('open', async () => {
        clearTimeout(openTimer);
        try {
          await callCdp('Page.enable');
          await callCdp('Runtime.enable');
          if (!isWorkbench) {
            const check = await callCdp('Runtime.evaluate', {
              expression: `Boolean(window.location?.protocol === 'vscode-file:' || /^https?:\\/\\/(?:127\\.0\\.0\\.1|localhost):\\d+\\//i.test(window.location?.href || '') || window.electronNative || document.querySelector('[id="antigravity.agentSidePanelInputBox"], body[data-agy-theme], body[data-newux-theme]'))`,
              returnByValue: true
            });
            isWorkbench = check?.result?.result?.value === true;
          }
          if (!isWorkbench) {
            ws.close();
            return complete(null);
          }
          if (target.type === 'page') {
            callCdp('Target.setDiscoverTargets', { discover: true }).catch(() => {});
          }
          await callCdp('Runtime.addBinding', { name: BINDING_NAME });
          await applyBundle();
          complete(sessionObj);
        } catch {
          try {
            ws.close();
          } catch {}
          complete(null);
        }
      });

      ws.addEventListener('close', () => {
        clearTimeout(openTimer);
        for (const [, fn] of callbacks) fn(null);
        callbacks.clear();
        complete(null);
      });
      ws.addEventListener('error', () => {
        clearTimeout(openTimer);
        complete(null);
      });
    } catch {
      clearTimeout(openTimer);
      complete(null);
    }
  });
}

export async function runDaemonLoop({ once = false } = {}) {
  if (!once) {
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    const existingPid = readDaemonPid();
    if (existingPid > 0 && existingPid !== process.pid) {
      try {
        process.kill(existingPid, 'SIGTERM');
      } catch {}
    }
    fs.writeFileSync(PID_LOCK_FILE, String(process.pid), 'utf8');
    const cleanup = () => {
      try {
        const firstLine = fs.existsSync(PID_LOCK_FILE)
          ? fs.readFileSync(PID_LOCK_FILE, 'utf8').split(/\r?\n/)[0]?.trim() || ''
          : '';
        if (firstLine === String(process.pid)) {
          fs.unlinkSync(PID_LOCK_FILE);
        }
      } catch {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
  }

  const builder = createPayloadBuilder();
  const relauncher = createRelaunchMonitor();
  const sessions = new Map();
  let syncing = false;
  let autoAiRunning = false;
  let lastDiscoveryMs = 0;
  let subTargetTimer = null;
  let ticks = 0;

  const notifySubTargetCreated = () => {
    lastDiscoveryMs = 0;
    if (subTargetTimer) return;
    subTargetTimer = setTimeout(() => {
      subTargetTimer = null;
      tick().catch(() => {});
    }, 80);
  };

  async function maybeTriggerBackgroundAiSync(config) {
    if (autoAiRunning || config.enabled === false || config.autoSyncAi !== true || config.locale === 'en') return;
    const state = readJsonFile(AUTO_AI_STATE_FILE, {});
    const lastRun = Number(state[config.locale] || 0);
    if (Date.now() - lastRun < AUTO_AI_COOLDOWN_MS) return;

    let candidateTotal = 0;
    for (const s of sessions.values()) {
      const check = await evaluateOnTarget(
        s.targetUrl || '',
        'window.__AGI18N_RUNTIME__?.collectUntranslated?.()?.length || 0',
        1500
      ).catch(() => null);
      if (check?.ok && Number(check.value) > 0) candidateTotal += Number(check.value);
    }
    if (candidateTotal < 5) return;

    autoAiRunning = true;
    try {
      fs.writeFileSync(AUTO_AI_STATE_FILE, JSON.stringify({ ...state, [config.locale]: Date.now() }), 'utf8');
    } catch {}
    const cliPath = path.join(PROJECT_ROOT, 'cli.mjs');
    const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', cliPath, 'sync-ai'], {
      stdio: 'ignore',
      windowsHide: true
    });
    child.on('exit', () => {
      autoAiRunning = false;
    });
    child.on('error', () => {
      autoAiRunning = false;
    });
  }

  let switching = false;
  let queuedLocale = '';

  const broadcastImmediateLocaleSwitch = async (nextLocale) => {
    queuedLocale = nextLocale;
    if (switching) return;
    switching = true;
    try {
      while (queuedLocale) {
        const targetAction = queuedLocale;
        queuedLocale = '';
        let updatedCfg;
        if (targetAction === '__ai_lang__:on' || targetAction === '__ai_lang__:off') {
          updatedCfg = writeConfigFile({ syncAiOutputLang: targetAction.endsWith(':on') });
        } else {
          updatedCfg = writeConfigFile({ locale: targetAction });
          syncIdeDisplayLanguage(updatedCfg.locale, { background: true });
        }
        syncAgentLanguageRule(updatedCfg.locale, updatedCfg.syncAiOutputLang === true);
        builder.refreshIfNeeded();
        const tasks = [];
        for (const s of sessions.values()) {
          tasks.push(s.applyBundle());
        }
        await Promise.allSettled(tasks);
      }
    } finally {
      switching = false;
    }
  };

  async function tick() {
    if (syncing || switching) return;
    syncing = true;
    ticks = (ticks + 1) % 10000;
    try {
      const { changed, config } = builder.refreshIfNeeded();
      if (changed) {
        syncAgentLanguageRule(config.locale, config.syncAiOutputLang === true);
      }
      const now = Date.now();
      const needDiscovery = once || changed || sessions.size === 0 || now - lastDiscoveryMs >= DISCOVERY_INTERVAL_MS;

      if (!needDiscovery) {
        if (ticks % 6 === 0) {
          for (const s of sessions.values()) {
            await s.ensureMounted();
          }
        }
        if (ticks > 0 && ticks % 720 === 0 && sessions.size > 0) {
          maybeTriggerBackgroundAiSync(config).catch(() => {});
        }
        return;
      }

      lastDiscoveryMs = now;
      const channels = resolveActiveChannels(config.channel);
      const seenTargetIds = new Set();
      const connectedChannels = new Set();

      for (const chInfo of channels) {
        const port = readDevToolsPort(chInfo.portFile);
        if (!port) continue;
        const pages = await fetchDevToolsPages(port);
        if (pages.length > 0) connectedChannels.add(chInfo.channel);

        for (const page of pages) {
          seenTargetIds.add(page.id);
          if (sessions.has(page.id)) {
            const existing = sessions.get(page.id);
            if (changed) await existing.applyBundle();
            else await existing.ensureMounted();
          } else {
            const created = await createPersistentSession(
              page,
              chInfo,
              () => builder.getCurrent(),
              (loc) => broadcastImmediateLocaleSwitch(loc).catch(() => {}),
              notifySubTargetCreated
            );
            if (created) sessions.set(page.id, created);
          }
        }
      }

      for (const [id, s] of Array.from(sessions.entries())) {
        if (!seenTargetIds.has(id)) {
          s.close();
          sessions.delete(id);
        }
      }

      if (!once && config.autoRelaunchCdp) {
        const unconnected = channels.filter((c) => c.installed && !connectedChannels.has(c.channel));
        if (unconnected.length > 0) {
          relauncher.checkAndRelaunchIfNeeded(unconnected);
        }
      }
    } finally {
      syncing = false;
    }
  }

  await tick();
  if (once) {
    for (const s of sessions.values()) s.close();
    sessions.clear();
    return;
  }
  let watchDebounce = null;
  try {
    if (fs.existsSync(DICT_DIR)) {
      const watcher = fs.watch(DICT_DIR, () => {
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          watchDebounce = null;
          tick().catch(() => {});
        }, 60);
      });
      watcher.unref?.();
    }
  } catch {}
  setInterval(() => tick().catch(() => {}), SYNC_INTERVAL_MS);
}

const directRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (directRun) {
  await runDaemonLoop({ once: process.argv.includes('--once') });
}

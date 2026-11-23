/**
 * src/injector.js — Multi-language DOM localizer, native Appearance language selector & phrase collector
 * Zero external dependencies, WeakMap restoration, instant CDP binding switch.
 */
(() => {
  const SKIP_CONTAINER_SEL = [
    'code',
    'pre',
    'kbd',
    'samp',
    'script',
    'style',
    'noscript',
    'textarea',
    'input',
    '[contenteditable="true"]',
    '.monaco-editor',
    '.monaco-diff-editor',
    '.xterm',
    '.prose',
    '.markdown',
    '[data-markdown-root]',
    '[data-testid="user-message-content"]',
    '[data-testid="conversation-row-sidebar"] a[href^="/c/"]',
    '[data-testid="conversation-row-sidebar"] span.truncate',
    '[data-testid="conversation-row-history"] a[href^="/c/"]',
    '[data-testid="conversation-row-history"] span.truncate',
    '[data-testid="conversation-navigator-turn"]',
    '[data-testid="breadcrumb-segment"]',
    '[data-agi18n-ignore="true"]'
  ].join(', ');

  const SKIP_FORM_PARENT_SEL = [
    '.monaco-editor',
    '.monaco-diff-editor',
    '.xterm',
    '[data-markdown-root]',
    '[data-testid="user-message-content"]'
  ].join(', ');

  const KEEP_UNTRANSLATED_EXACT = new Set([
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
    'Antigravity Insiders',
    'Google Antigravity',
    'Gemini',
    'Claude',
    'GitHub',
    'Google Drive',
    'Google Cloud',
    'VS Code',
    'MCP',
    'SSH',
    'WSL',
    'PDF',
    'HTML',
    'JSON',
    'Markdown',
    'Worktree'
  ]);

  const PROTECTED_ARIA_LABELS = new Set(['Cancel']);

  const RE_LOCALIZED_SCRIPT = /[\u00c0-\u024f\u0900-\u097f\u0e00-\u0e7f\u1e00-\u1eff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
  const RE_ALPHA = /[A-Za-z]/;
  const RE_PURE_ASCII_WORDS = /^\s*[A-Za-z][A-Za-z\s]*\s*$/;
  const RE_CANDIDATE_SKIP =
    /^(?:https?:\/\/|file:\/\/|vscode-file:\/\/|sidecar:\/\/|[A-Za-z]:\\|\/[\w.-]+\/|~\/|[@#-][\w.-]+|\S+@\S+\.\S+|\d+(?:\.\d+)*%?|[0-9a-f]{8}-[0-9a-f-]{27}|v?\d+\.\d+\.\d+)/i;
  const SKIP_COLLECT_CONTAINER_SEL =
    '[data-testid*="message"], [data-testid*="turn"], [data-testid*="terminal"], [data-testid*="history"], [class*="xterm"]';
  const RE_MODEL_NAME = /^(?:Gemini|Claude|GPT|Llama|Qwen|DeepSeek)\b/i;

  const UNIT_KEY_NORM = {
    s: 's',
    sec: 's',
    secs: 's',
    second: 's',
    seconds: 's',
    m: 'm',
    min: 'm',
    mins: 'm',
    minute: 'm',
    minutes: 'm',
    h: 'h',
    hr: 'h',
    hrs: 'h',
    hour: 'h',
    hours: 'h',
    d: 'd',
    day: 'd',
    days: 'd',
    w: 'w',
    mo: 'mo',
    y: 'y',
    yr: 'y',
    yrs: 'y'
  };

  const MONTH_INDEX = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
  };

  const LANG_UI_LABELS = {
    en: { title: 'Display Language', desc: 'Choose the display language for the Antigravity interface.' },
    'zh-CN': { title: '界面语言', desc: '选择 Antigravity 客户端界面的显示语言（实时生效）。' },
    'zh-TW': { title: '介面語言', desc: '選擇 Antigravity 應用程式的介面顯示語言（即時生效）。' },
    'zh-SG': { title: '界面语言', desc: '选择 Antigravity 客户端界面的显示语言（实时生效）。' },
    ja: { title: '表示言語', desc: 'Antigravity インターフェースの表示言語を選択します（即時反映）。' },
    ko: { title: '표시 언어', desc: 'Antigravity 인터페이스의 표시 언어를 선택합니다 (즉시 적용).' },
    vi: { title: 'Ngôn ngữ hiển thị', desc: 'Chọn ngôn ngữ hiển thị cho giao diện Antigravity (áp dụng ngay).' },
    hi: { title: 'प्रदर्शन भाषा', desc: 'Antigravity इंटरफ़ेस के लिए प्रदर्शन भाषा चुनें (तुरंत लागू)।' },
    id: { title: 'Bahasa Tampilan', desc: 'Pilih bahasa tampilan untuk antarmuka Antigravity (langsung aktif).' },
    th: { title: 'ภาษาที่แสดง', desc: 'เลือกภาษาสำหรับหน้าจอ Antigravity (มีผลทันที)' },
    es: { title: 'Idioma de la interfaz', desc: 'Elige el idioma de visualización para Antigravity (cambio instantáneo).' },
    fr: { title: 'Langue d’affichage', desc: 'Choisissez la langue de l’interface Antigravity (application immédiate).' },
    de: { title: 'Anzeigesprache', desc: 'Wählen Sie die Anzeigesprache für die Antigravity-Oberfläche (sofort aktiv).' },
    pt: { title: 'Idioma de exibição', desc: 'Escolha o idioma da interface do Antigravity (aplicado instantaneamente).' },
    it: { title: 'Lingua di visualizzazione', desc: 'Scegli la lingua dell’interfaccia di Antigravity (attiva subito).' }
  };

  function fillTpl(tpl, vars) {
    if (!tpl) return null;
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
  }

  function formatDurationLocalized(rawDur, pat) {
    const s = String(rawDur || '').trim();
    const units = pat?.units || { d: 'd', h: 'h', m: 'm', s: 's' };
    if (s === '<1m' || s === '< 1m') return pat?.lessThanOneMin || '<1m';
    const noSpace = !/\s/.test(pat?.ago?.replace('{0}', '').replace('{unit}', '') || ' ');
    const sep = noSpace ? '' : ' ';
    return s
      .replace(/(\d+)\s*(?:days?|d)\b/gi, `$1${sep}${units.d}`)
      .replace(/(\d+)\s*(?:hours?|hrs?|h)\b/gi, `$1${sep}${units.h}`)
      .replace(/(\d+)\s*(?:minutes?|mins?|m)\b/gi, `$1${sep}${units.m}`)
      .replace(/(\d+)\s*(?:seconds?|secs?|s)\b/gi, `$1${sep}${units.s}`)
      .replace(/,\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function translateStepClauseLocalized(part, pat) {
    if (!pat) return null;
    const low = part.trim().toLowerCase();
    if (pat.stepPhrases && pat.stepPhrases[low]) return pat.stepPhrases[low];
    const m = low.match(/^(explored|edited|ran)\s+(\d+)\s+(files?|artifacts?|commands?)$/);
    if (m && pat.stepVerbs && pat.stepNouns) {
      const verb = pat.stepVerbs[m[1]] || m[1];
      const nounKey = m[3].startsWith('file') ? 'file' : m[3].startsWith('artifact') ? 'artifact' : 'command';
      const noun = pat.stepNouns[nounKey] || m[3];
      return `${verb} ${m[2]} ${noun}`;
    }
    return null;
  }

  function translateDynamicPattern(trimmed, pat) {
    if (!pat) return null;
    let m;
    const units = pat.units || {};
    const periods = pat.periods || {};

    if ((m = trimmed.match(/^(\d+(?:\.\d+)?)%\s*left$/i))) return fillTpl(pat.pctLeft, { 0: m[1] });
    if ((m = trimmed.match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|w|mo|y|yr|yrs)\s+ago$/i))) {
      const uk = UNIT_KEY_NORM[m[2].toLowerCase()] || 's';
      return fillTpl(pat.ago, { 0: m[1], unit: units[uk] || m[2] });
    }
    if ((m = trimmed.match(/^Resets in\s+(.+)$/i))) {
      return fillTpl(pat.resetsIn, { 0: formatDurationLocalized(m[1], pat) });
    }
    if ((m = trimmed.match(/^(\d+)\s*([smhd])\s+limit,\s*resets in\s+(.+)$/i))) {
      return fillTpl(pat.windowLimitResets, {
        0: m[1],
        unit: units[m[2].toLowerCase()] || m[2],
        1: formatDurationLocalized(m[3], pat)
      });
    }
    if ((m = trimmed.match(/^(Weekly|Daily|Monthly)\s+limit,\s*resets in\s+(.+)$/i))) {
      return fillTpl(pat.namedLimitResets, {
        period: periods[m[1].toLowerCase()] || m[1],
        0: formatDurationLocalized(m[2], pat)
      });
    }
    if ((m = trimmed.match(/^(.+?)\s+(Weekly|Daily|Monthly)\s+limit$/i))) {
      return fillTpl(pat.modelNamedLimit, {
        0: m[1].trim(),
        period: periods[m[2].toLowerCase()] || m[2]
      });
    }
    if ((m = trimmed.match(/^(\d+)\s+files?\s+changed$/i))) return fillTpl(pat.filesChanged, { 0: m[1] });
    if ((m = trimmed.match(/^(\d+)\s+tools?$/i))) return fillTpl(pat.toolsCount, { 0: m[1] });
    if ((m = trimmed.match(/^(\d+)\s+tools?\s+excluded$/i))) return fillTpl(pat.toolsExcluded, { 0: m[1] });
    if ((m = trimmed.match(/^(\d+)\s+active\s+conversations$/i))) return fillTpl(pat.activeConvs, { 0: m[1] });
    if ((m = trimmed.match(/^(\d+)\s+updates?$/i))) return fillTpl(pat.updatesCount, { 0: m[1] });
    if ((m = trimmed.match(/^(\d+)\s+projects?$/i))) return fillTpl(pat.projectsCount, { 0: m[1] });
    if ((m = trimmed.match(/^See all\s*\((\d+)\)$/i))) return fillTpl(pat.seeAll, { 0: m[1] });
    if ((m = trimmed.match(/^Show\s+(\d+)\s+more\s+subagents?$/i))) return fillTpl(pat.showMoreSubagents, { 0: m[1] });
    if ((m = trimmed.match(/^Worked for\s+([<0-9smhd\s]+?)\s*·\s*(\d+)\s+updates?$/i))) {
      return fillTpl(pat.workedUpdates, { 0: formatDurationLocalized(m[1], pat), 1: m[2] });
    }
    if ((m = trimmed.match(/^Worked for\s+([<0-9smhd]+(?:\s+\d+[smhd])*)$/i))) {
      return fillTpl(pat.workedFor, { 0: formatDurationLocalized(m[1], pat) });
    }
    if ((m = trimmed.match(/^(?:Thought|Thinking)\s+for\s+([<0-9smhd]+(?:\s+\d+[smhd])*)$/i))) {
      return fillTpl(pat.thoughtFor, { 0: formatDurationLocalized(m[1], pat) });
    }
    if ((m = trimmed.match(/^Running for\s+([<0-9smhd]+(?:\s+\d+[smhd])*)$/i))) {
      return fillTpl(pat.runningFor, { 0: formatDurationLocalized(m[1], pat) });
    }
    if ((m = trimmed.match(/^Exited with code\s+(-?\d+)(\.)?$/i))) {
      return fillTpl(pat.exitedCode, { 0: m[1] }) + (m[2] ? '.' : '');
    }
    if ((m = trimmed.match(/^([^\r\n]{1,200}?)\s*·\s*Exited with code\s+(-?\d+)$/))) {
      return `${m[1].trim()} · ${fillTpl(pat.exitedCode, { 0: m[2] })}`;
    }
    if ((m = trimmed.match(/^Your Plan:\s*([^\r\n]{1,80})$/))) {
      return fillTpl(pat.yourPlan, { 0: m[1].trim() });
    }
    if ((m = trimmed.match(/^Available AI Credits:\s*([^\r\n]{1,40})$/i))) {
      return fillTpl(pat.availableCredits, { 0: m[1].trim() });
    }
    if ((m = trimmed.match(/^Started\s+(from|during)\s+[“"](.+)[”"]$/))) {
      return fillTpl(m[1] === 'during' ? pat.startedDuring : pat.startedFrom, { 0: m[2].trim() });
    }
    if ((m = trimmed.match(/^[“"]?(\d+)\s+comments?\s+in\s+([^”"]+)[”"]?$/i))) {
      return fillTpl(pat.commentsInFile, { 0: m[1], 1: m[2].trim() });
    }
    if ((m = trimmed.match(/^Updated\s+(?:([A-Za-z]{3})\s+(\d{1,2}),\s*)?(\d{1,2}:\d{2}(?:\s*[AP]M)?)$/i))) {
      if (m[1] && m[2]) {
        const mon = MONTH_INDEX[m[1].toLowerCase()];
        if (mon) return fillTpl(pat.updatedDate, { mon, day: m[2], time: m[3] });
      }
      return fillTpl(pat.updatedTime, { time: m[3] });
    }

    if (/^(?:Explored|Edited|Ran)\b/i.test(trimmed)) {
      const parts = trimmed.split(/,\s*/);
      const mapped = [];
      for (const p of parts) {
        const loc = translateStepClauseLocalized(p, pat);
        if (!loc) {
          mapped.length = 0;
          break;
        }
        mapped.push(loc);
      }
      if (mapped.length > 0) return mapped.join(pat.stepJoiner || ', ');
    }
    return null;
  }

  function resolveContextOverride(trimmed, el, dictVal, ctxCfg) {
    if (!el || typeof el.closest !== 'function' || !ctxCfg) return dictVal;
    if (trimmed === 'Plan' && el.closest('[role="dialog"]') && ctxCfg.dialogPlan) {
      return ctxCfg.dialogPlan;
    }
    if (trimmed === 'Default') {
      if (el.closest('[data-testid="permissions-default-tag"]') && ctxCfg.globalDefault) return ctxCfg.globalDefault;
      if (
        el.closest('[data-testid="permissions-preset-option-default"], [data-testid="permissions-selector-trigger"]') &&
        ctxCfg.permDefault
      ) {
        return ctxCfg.permDefault;
      }
    }
    if (
      trimmed === 'View' &&
      el.closest('button') &&
      !el.closest('[aria-haspopup], [role="menuitem"], [role="menu"], header') &&
      ctxCfg.buttonView
    ) {
      return ctxCfg.buttonView;
    }
    if (trimmed === 'Type' && ctxCfg.promptType) {
      const parentText = el.parentElement ? el.parentElement.textContent || '' : '';
      if (/\band select\b|\/plan\b/i.test(parentText)) return ctxCfg.promptType;
    }
    return dictVal;
  }

  function isCandidateUiPhrase(trimmed) {
    if (trimmed.length < 2 || trimmed.length > 180) return false;
    if (RE_LOCALIZED_SCRIPT.test(trimmed) || !RE_ALPHA.test(trimmed)) return false;
    if (KEEP_UNTRANSLATED_EXACT.has(trimmed)) return false;
    if (RE_CANDIDATE_SKIP.test(trimmed) || RE_MODEL_NAME.test(trimmed)) return false;
    if (/^[\W\d_]+$/.test(trimmed)) return false;
    if (/[{}[\];<>`$\\]/.test(trimmed)) return false;
    const docTitlePrefix = String(document.title || '').split(' - ')[0].trim();
    if (docTitlePrefix && trimmed === docTitlePrefix) return false;
    return true;
  }

  window.__AGI18N_BOOT__ = function bootAgI18n(payload) {
    const isSubFrame = window.top !== window;
    if (isSubFrame) {
      const isSwarmFrame = window.location?.protocol === 'plugin:' && /^swarm--/i.test(window.location?.hostname || '');
      if (!isSwarmFrame) return;
    }
    if (!payload || typeof payload !== 'object') return;

    const prevRuntime = window.__AGI18N_RUNTIME__;
    const textOrigMap = prevRuntime?.textOrigMap instanceof WeakMap ? prevRuntime.textOrigMap : new WeakMap();
    const untrackedSet = prevRuntime?.untranslated instanceof Set ? prevRuntime.untranslated : new Set();

    if (prevRuntime && typeof prevRuntime.teardown === 'function') {
      prevRuntime.teardown(false);
    }

    const buildId = String(payload.buildId || 'agi18n-1.1.0');
    const locale = String(payload.locale || 'zh-CN');
    const enabled = payload.enabled !== false;
    const shouldCollect = Boolean(payload.collectUntranslated);
    const dict = Object.assign(Object.create(null), payload.dict || {});
    const localeOptions = Array.isArray(payload.localeOptions) ? payload.localeOptions : [];
    const ctxOverrides = payload.contextOverrides || {};
    const patterns = payload.patterns || null;
    const skipCache = new WeakMap();

    let observer = null;
    let rafId = 0;
    let timerId = 0;
    let clickRafId = 0;
    let clickTimerId = 0;
    let outsideMenuListener = null;
    const dirtyNodes = new Set();

    function closeLanguagePopover() {
      const pop = document.getElementById('agi18n-language-popover');
      if (pop) pop.remove();
      const btn = document.getElementById('agi18n-language-trigger');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function requestLocaleSwitch(nextLocale) {
      closeLanguagePopover();
      if (!nextLocale || nextLocale === locale) return;
      window.__AGI18N_PENDING_LOCALE__ = nextLocale;
      if (typeof window.__agi18n_switch_locale === 'function') {
        try {
          window.__agi18n_switch_locale(nextLocale);
        } catch {}
      }
    }

    function readOriginalText(el) {
      if (!el) return '';
      let out = '';
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const tn = walker.currentNode;
        const saved = textOrigMap.get(tn);
        out += saved ? saved.original : tn.nodeValue || '';
      }
      return out.trim();
    }

    function findAppearanceTargetCard() {
      const cards = document.querySelectorAll('.agy-card');
      if (cards.length === 0) return null;

      // 1. Insiders & modern layout: section with <h3> "Appearance" wrapping .agy-card (Theme / Contrast / Font / Font size)
      for (const card of cards) {
        const sec = card.closest('.space-y-2');
        const h3 = sec ? sec.querySelector('h3') : null;
        if (h3 && readOriginalText(h3) === 'Appearance') {
          return card;
        }
      }

      // 2. Fallback: card containing Theme + Font rows, or theme-preset selector on Stable
      for (const card of cards) {
        if (card.querySelector('[id^="theme-preset-label-"]')) {
          return card;
        }
        const rowTitles = Array.from(card.querySelectorAll(':scope > div span:first-child')).map((s) => readOriginalText(s));
        if (rowTitles.includes('Theme') && (rowTitles.includes('Font') || rowTitles.includes('Font size') || rowTitles.includes('Font Size'))) {
          return card;
        }
      }
      return null;
    }

    function ensureAppearanceLanguageRow() {
      if (isSubFrame || localeOptions.length === 0) return;
      const themeCard = findAppearanceTargetCard();
      if (!themeCard) {
        closeLanguagePopover();
        return;
      }

      const uiCopy = LANG_UI_LABELS[locale] || LANG_UI_LABELS.en;
      const currentOpt = localeOptions.find((o) => o.code === locale) || localeOptions[0];

      let row = document.getElementById('agi18n-language-row');
      if (!row) {
        row = document.createElement('div');
        row.id = 'agi18n-language-row';
        row.setAttribute('data-agi18n-ignore', 'true');
        row.className = 'py-2 px-3 w-full bg-transparent flex justify-between gap-4 items-center';
        themeCard.insertBefore(row, themeCard.firstChild);
      } else if (row.parentElement !== themeCard) {
        themeCard.insertBefore(row, themeCard.firstChild);
      }

      if (row.getAttribute('data-rendered-build') === buildId) return;
      row.setAttribute('data-rendered-build', buildId);

      row.innerHTML = '';
      const leftCol = document.createElement('div');
      leftCol.className = 'flex-1 flex flex-col gap-0.5';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'flex items-center gap-1.5';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = uiCopy.title;
      titleWrap.appendChild(titleSpan);
      const descSpan = document.createElement('span');
      descSpan.className = 'text-sm text-muted-foreground whitespace-pre-wrap';
      descSpan.textContent = uiCopy.desc;
      leftCol.appendChild(titleWrap);
      leftCol.appendChild(descSpan);

      const rightCol = document.createElement('div');
      rightCol.className = 'shrink-0 relative';
      const triggerBtn = document.createElement('button');
      triggerBtn.id = 'agi18n-language-trigger';
      triggerBtn.type = 'button';
      triggerBtn.setAttribute('role', 'combobox');
      triggerBtn.setAttribute('aria-expanded', 'false');
      triggerBtn.className =
        'agy-select-trigger appearance-none px-2.5 py-1 bg-secondary text-secondary-foreground hover:text-foreground rounded-md border-none cursor-pointer flex items-center gap-2 justify-between min-w-[185px]';

      const valSpan = document.createElement('span');
      valSpan.className = 'truncate';
      valSpan.textContent = currentOpt.label;

      const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrowSvg.setAttribute('width', '16');
      arrowSvg.setAttribute('height', '16');
      arrowSvg.setAttribute('viewBox', '0 -960 960 960');
      arrowSvg.setAttribute('fill', 'currentColor');
      arrowSvg.setAttribute('aria-hidden', 'true');
      arrowSvg.setAttribute('class', 'w-3 h-3 shrink-0 opacity-70 ml-1');
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', 'M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z');
      arrowSvg.appendChild(pathEl);

      triggerBtn.appendChild(valSpan);
      triggerBtn.appendChild(arrowSvg);
      rightCol.appendChild(triggerBtn);
      row.appendChild(leftCol);
      row.appendChild(rightCol);

      triggerBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const existingPop = document.getElementById('agi18n-language-popover');
        if (existingPop) {
          closeLanguagePopover();
          return;
        }
        triggerBtn.setAttribute('aria-expanded', 'true');
        const rect = triggerBtn.getBoundingClientRect();
        const pop = document.createElement('div');
        pop.id = 'agi18n-language-popover';
        pop.setAttribute('data-agi18n-ignore', 'true');
        pop.setAttribute('role', 'listbox');
        Object.assign(pop.style, {
          position: 'fixed',
          top: `${Math.min(window.innerHeight - 350, rect.bottom + 4)}px`,
          left: `${Math.max(8, rect.right - 244)}px`,
          width: '244px',
          maxHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: '2147483647',
          background: 'var(--background, #1f1f22)',
          color: 'var(--foreground, #f4f4f5)',
          border: '1px solid var(--border, rgba(128,128,128,0.28))',
          borderRadius: '8px',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)'
        });

        const listWrap = document.createElement('div');
        Object.assign(listWrap.style, {
          overflowY: 'auto',
          flex: '1',
          padding: '4px'
        });

        for (const opt of localeOptions) {
          const item = document.createElement('button');
          item.type = 'button';
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(opt.code === locale));
          item.className =
            'w-full px-2.5 py-1.5 rounded-md border-none bg-transparent hover:bg-secondary text-left cursor-pointer flex items-center justify-between text-sm transition-colors';
          item.style.color = 'inherit';

          const labelNode = document.createElement('span');
          labelNode.className = 'truncate';
          labelNode.textContent = opt.label;
          item.appendChild(labelNode);

          if (opt.code === locale) {
            const checkNode = document.createElement('span');
            checkNode.textContent = '✓';
            checkNode.style.opacity = '0.85';
            item.appendChild(checkNode);
          }

          item.addEventListener('click', (e) => {
            e.stopPropagation();
            requestLocaleSwitch(opt.code);
          });
          listWrap.appendChild(item);
        }

        pop.appendChild(listWrap);
        document.body.appendChild(pop);
      });
    }

    function syncCustomStyle(cssText) {
      const existing = document.getElementById('agi18n-custom-css');
      if (!enabled || !cssText || !cssText.trim()) {
        if (existing) existing.remove();
        return;
      }
      const styleEl = existing || document.createElement('style');
      styleEl.id = 'agi18n-custom-css';
      if (styleEl.textContent !== cssText) styleEl.textContent = cssText;
      if (!styleEl.parentNode && document.head) document.head.appendChild(styleEl);
    }

    function restoreDom(root = document.body) {
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const tNode = walker.currentNode;
        const saved = textOrigMap.get(tNode);
        if (saved) {
          if (tNode.nodeValue === saved.translated) tNode.nodeValue = saved.original;
          textOrigMap.delete(tNode);
        }
      }
      const attrTargets = root.querySelectorAll
        ? root.querySelectorAll('[data-agi18n-orig-title], [data-agi18n-orig-placeholder], [data-agi18n-orig-aria-label]')
        : [];
      for (const el of attrTargets) {
        for (const attr of ['title', 'placeholder', 'aria-label']) {
          const origKey = `data-agi18n-orig-${attr}`;
          const lastKey = `data-agi18n-last-${attr}`;
          const origVal = el.getAttribute(origKey);
          const lastVal = el.getAttribute(lastKey);
          if (origVal !== null && el.getAttribute(attr) === lastVal) el.setAttribute(attr, origVal);
          el.removeAttribute(origKey);
          el.removeAttribute(lastKey);
        }
      }
    }

    function isSkippedElement(el) {
      if (!el || el.nodeType !== 1) return true;
      if (skipCache.get(el) === true) return true;
      if (el.closest(SKIP_CONTAINER_SEL)) {
        if (el.isConnected) skipCache.set(el, true);
        return true;
      }
      return false;
    }

    function recordUntranslated(trimmed, contextEl) {
      if (!shouldCollect || untrackedSet.size >= 300) return;
      if (contextEl && typeof contextEl.closest === 'function' && contextEl.closest(SKIP_COLLECT_CONTAINER_SEL)) return;
      if (isCandidateUiPhrase(trimmed)) untrackedSet.add(trimmed);
    }

    function translateRawString(raw, contextEl) {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (!trimmed || KEEP_UNTRANSLATED_EXACT.has(trimmed)) return null;

      let hit = resolveContextOverride(trimmed, contextEl, dict[trimmed], ctxOverrides);
      if (typeof hit !== 'string' && trimmed.endsWith('.')) {
        const base = dict[trimmed.slice(0, -1)];
        if (typeof base === 'string') {
          const dotChar = locale.startsWith('zh') || locale === 'ja' ? '。' : '.';
          hit = base.endsWith(dotChar) ? base : `${base}${dotChar}`;
        }
      }
      if (typeof hit === 'string') {
        untrackedSet.delete(trimmed);
        if (RE_LOCALIZED_SCRIPT.test(hit) && RE_PURE_ASCII_WORDS.test(raw)) return hit;
        return raw.replace(trimmed, () => hit);
      }

      if (!RE_ALPHA.test(trimmed)) return null;
      const dyn = translateDynamicPattern(trimmed, patterns);
      if (typeof dyn === 'string') return raw.replace(trimmed, () => dyn);

      recordUntranslated(trimmed, contextEl);
      return null;
    }

    function processTextNode(node) {
      const cur = node.nodeValue;
      if (!cur) return;
      const rec = textOrigMap.get(node);
      if (rec && rec.translated === cur && rec.buildId === buildId) return;

      const sourceRaw = rec && rec.translated === cur ? rec.original : cur;
      const next = translateRawString(sourceRaw, node.parentElement);
      if (typeof next === 'string') {
        textOrigMap.set(node, { original: sourceRaw, translated: next, buildId });
        if (node.nodeValue !== next) node.nodeValue = next;
      } else if (rec && rec.translated === cur) {
        node.nodeValue = sourceRaw;
        textOrigMap.delete(node);
      }
    }

    function processElementAttributes(el) {
      if (!el || el.nodeType !== 1) return;
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.closest(SKIP_FORM_PARENT_SEL)) return;

      for (const attr of ['title', 'placeholder', 'aria-label']) {
        const cur = el.getAttribute(attr);
        const origKey = `data-agi18n-orig-${attr}`;
        const lastKey = `data-agi18n-last-${attr}`;
        const verProp = `__agi18n_ver_${attr}`;
        if (!cur) continue;
        if (attr === 'aria-label' && PROTECTED_ARIA_LABELS.has(cur.trim())) continue;

        const savedOrig = el.getAttribute(origKey);
        const savedLast = el.getAttribute(lastKey);
        if (savedOrig !== null && savedLast === cur && el[verProp] === buildId) continue;

        const sourceVal = savedOrig !== null && savedLast === cur ? savedOrig : cur;
        const nextVal = translateRawString(sourceVal, el);
        if (typeof nextVal === 'string') {
          el.setAttribute(origKey, sourceVal);
          el.setAttribute(lastKey, nextVal);
          el[verProp] = buildId;
          if (cur !== nextVal) el.setAttribute(attr, nextVal);
        } else if (savedOrig !== null && savedLast === cur) {
          el.setAttribute(attr, savedOrig);
          el.removeAttribute(origKey);
          el.removeAttribute(lastKey);
          el[verProp] = buildId;
        }
      }
    }

    function walkAndLocalize(root) {
      if (!root || !enabled) return;
      if (root.nodeType === 3) {
        if (root.parentElement && !isSkippedElement(root.parentElement)) processTextNode(root);
        return;
      }
      if (root.nodeType !== 1) return;
      if (isSkippedElement(root)) {
        if (root.tagName === 'INPUT' || root.tagName === 'TEXTAREA') processElementAttributes(root);
        return;
      }

      processElementAttributes(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (node.nodeType === 1) {
            if (isSkippedElement(node)) {
              if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') processElementAttributes(node);
              return NodeFilter.FILTER_REJECT;
            }
            processElementAttributes(node);
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      while (walker.nextNode()) processTextNode(walker.currentNode);
    }

    function flushDirtyQueue() {
      rafId = 0;
      ensureAppearanceLanguageRow();
      if (!enabled || dirtyNodes.size === 0) {
        dirtyNodes.clear();
        return;
      }
      if (dirtyNodes.size > 240) {
        dirtyNodes.clear();
        if (!document.hidden && document.body) walkAndLocalize(document.body);
        return;
      }
      const snapshot = Array.from(dirtyNodes);
      dirtyNodes.clear();
      for (const n of snapshot) {
        if (n && n.isConnected) walkAndLocalize(n);
      }
    }

    function scheduleFlush() {
      if (document.hidden) {
        if (!timerId) {
          timerId = setTimeout(() => {
            timerId = 0;
            flushDirtyQueue();
          }, 300);
        }
        return;
      }
      if (!rafId) {
        rafId = requestAnimationFrame(flushDirtyQueue);
      }
      if (!timerId) {
        timerId = setTimeout(() => {
          timerId = 0;
          flushDirtyQueue();
        }, 90);
      }
    }

    function schedulePostClickAppearanceCheck() {
      if (!clickRafId) {
        clickRafId = requestAnimationFrame(() => {
          clickRafId = 0;
          ensureAppearanceLanguageRow();
        });
      }
      if (clickTimerId) clearTimeout(clickTimerId);
      clickTimerId = setTimeout(() => {
        clickTimerId = 0;
        ensureAppearanceLanguageRow();
      }, 90);
    }

    function mount() {
      syncCustomStyle(payload.customCss || '');
      if (!enabled && document.body) {
        restoreDom(document.body);
      } else if (enabled && document.body) {
        walkAndLocalize(document.body);
      }
      ensureAppearanceLanguageRow();

      if (document.body) {
        outsideMenuListener = (ev) => {
          const rawTarget = ev.target;
          const targetEl = rawTarget && rawTarget.nodeType === 1 ? rawTarget : rawTarget?.parentElement || null;
          const pop = document.getElementById('agi18n-language-popover');
          const trig = document.getElementById('agi18n-language-trigger');
          if (pop && (!targetEl || !pop.contains(targetEl)) && (!trig || !targetEl || !trig.contains(targetEl))) {
            closeLanguagePopover();
          }
          if (targetEl && (!pop || !pop.contains(targetEl)) && targetEl.closest('button, [role="tab"], [role="button"]')) {
            schedulePostClickAppearanceCheck();
          }
        };
        document.addEventListener('click', outsideMenuListener, true);

        observer = new MutationObserver((mutations) => {
          let sawElementAdd = false;
          for (const m of mutations) {
            if (m.type === 'characterData') {
              if (enabled) dirtyNodes.add(m.target);
            } else if (m.type === 'attributes') {
              if (enabled) processElementAttributes(m.target);
            } else if (m.type === 'childList') {
              for (const added of m.addedNodes) {
                if (added.nodeType === 1) sawElementAdd = true;
                if (enabled && (added.nodeType === 1 || added.nodeType === 3)) dirtyNodes.add(added);
              }
            }
          }
          if (dirtyNodes.size > 0 || sawElementAdd) scheduleFlush();
        });
        const observeOpts = enabled
          ? {
              childList: true,
              subtree: true,
              characterData: true,
              attributes: true,
              attributeFilter: ['title', 'placeholder', 'aria-label']
            }
          : {
              childList: true,
              subtree: true
            };
        observer.observe(document.body, observeOpts);
      }
    }

    function teardown(fullUninstall = true) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (outsideMenuListener) {
        document.removeEventListener('click', outsideMenuListener, true);
        outsideMenuListener = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (timerId) {
        clearTimeout(timerId);
        timerId = 0;
      }
      if (clickRafId) {
        cancelAnimationFrame(clickRafId);
        clickRafId = 0;
      }
      if (clickTimerId) {
        clearTimeout(clickTimerId);
        clickTimerId = 0;
      }
      dirtyNodes.clear();
      closeLanguagePopover();
      if (fullUninstall) {
        document.getElementById('agi18n-language-row')?.remove();
        document.getElementById('agi18n-custom-css')?.remove();
        if (document.body) restoreDom(document.body);
      }
    }

    window.__AGI18N_RUNTIME__ = {
      buildId,
      locale,
      enabled,
      dictCount: Object.keys(dict).length,
      textOrigMap,
      untranslated: untrackedSet,
      switchLocale: requestLocaleSwitch,
      rescan() {
        if (enabled && document.body) walkAndLocalize(document.body);
        ensureAppearanceLanguageRow();
        return Array.from(untrackedSet);
      },
      collectUntranslated() {
        if (enabled && document.body) walkAndLocalize(document.body);
        return Array.from(untrackedSet).filter((item) => !dict[item] && isCandidateUiPhrase(item));
      },
      teardown
    };

    if (document.body) mount();
    else window.addEventListener('DOMContentLoaded', mount, { once: true });
  };
})();

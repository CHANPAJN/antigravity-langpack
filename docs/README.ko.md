<div align="center">

# antigravity-langpack — Google Antigravity 2.0 한국어 패치 · 다국어 팩

**`app.asar` 무개조(macOS 공식 서명 유지) · `.exe` 바이너리 제로 기반의 Google Antigravity / Insiders 네이티브 한국어 및 다국어(13개 언어 · 14개 로케일) 전환 도구.**

<p>
  <a href="../README.md">English</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./README.zh-TW.md">繁體中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <b>한국어</b>
</p>

<p align="center">
  <img src="./demo.gif" width="840" alt="antigravity-langpack Native Display Language Switcher Demo" />
</p>

</div>

---

## 핵심 특징

1. **클라이언트 원본 무개조 (`app.asar` 보존 · macOS 서명 안전)**:
   설치 폴더나 앱 번들을 수정하지 않아 macOS에서 “앱이 손상되었습니다” 경고나 키체인 암호 반복 요청이 발생하지 않으며, 관리자 권한(`sudo`) 없이 설치됩니다.
2. **일반 자동 업데이트 후에도 재패치 불필요**:
   `Stable` 정식 버전과 `Insiders` 프리뷰 버전의 일반 업데이트 이후에도 매번 패치를 다시 실행할 필요가 없습니다.
3. **「설정 → 모양(Appearance)」 내장 드롭다운으로 재시작 없는 즉시 언어 전환**:
   재시작 없이 앱 내 `설정 → 모양 → 표시 언어` 메뉴에서 **한국어(1,920개 전체 항목 수록, VS Code 한국어판 기준 개발 용어)** 와 원본 영어(English) 등 14개 로케일을 즉시 전환할 수 있습니다.
4. **100% 순수 텍스트 스크립트 · 외부 의존성 제로 · 온디맨드 샌드박스 번역(기본 비활성화)**:
   `.exe` / `.dll` 실행 파일 및 서드파티 `npm` 패키지가 전혀 없으며, 백그라운드 문구 수집 및 자동 AI 호출은 **기본적으로 비활성화**되어 있습니다. 새 버전에서 추가된 영어 UI 라벨은 필요할 때 `node cli.mjs sync-ai`로 읽기 전용 샌드박스에서 보완할 수 있습니다.

---

## 빠른 설치 (macOS / Windows / Linux)

공식 **Node.js >= 22.13.0** 환경이 필요합니다.

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 한국어를 기본 언어로 설치
node cli.mjs install --lang ko

# macOS 선택 사항: 디버그 포트를 포함해 바로 실행하는 순수 셸 Dock 런처 생성
node cli.mjs install --lang ko --mac-launcher

# 선택 사항: 대화형 동기화 스킬(~/.gemini/config/skills/) 명시적 설치
node cli.mjs install --lang ko --with-skill
```

- **제거 및 원본 영어 즉시 복원**: `node cli.mjs uninstall`

---

## 작동 방식 및 투명성 안내

- **초기 실행 디버그 포트 자동 연결(`autoRelaunchCdp: true`)**: `--remote-debugging-port=0` 없이 실행된 경우, 실행 직후(`15초` 미만)이며 최근 대화 기록 쓰기가 없는 신규 프로세스에 한해서만 정상 종료 요청(`CloseMainWindow` / `SIGTERM`만 사용하며 강제 종료 `-Force` / `SIGKILL`은 절대 사용하지 않음) 후 포트를 붙여 1회 재시작합니다. 창이 종료를 거부하면 즉시 예외 처리하여 실행 중인 작업을 보호하며, `dict/config.json`에서 `"autoRelaunchCdp": false`로 끌 수 있습니다.
- **셀렉터 범위 및 기본 프라이버시**: 연결된 창은 CDP WebSocket 이벤트 기반으로 동작하며(4초 간격 로컬 포트 확인), 향후 대규모 UI 개편으로 설정 창 DOM 구조 자체가 변경될 경우 셀렉터 업데이트가 필요합니다. 기본 설치 시 `~/.gemini/config/skills/`를 수정하거나 백그라운드 수집을 수행하지 않습니다.

---

## 라이선스

OSI 인증 오픈소스 라이선스인 [GNU General Public License v3.0 (GPL-3.0)](../LICENSE)을 따릅니다.

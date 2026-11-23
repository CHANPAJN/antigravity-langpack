<div align="center">

# antigravity-langpack — Google Antigravity 2.0 한국어 패치 · 다국어 팩

**`app.asar` 무개조(macOS 공식 서명 유지) · 자동 업데이트 후에도 풀리지 않음 · `.exe` 바이너리 제로 기반의 Google Antigravity / Insiders 네이티브 한국어 및 14개 국어 실시간 전환 도구.**

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
2. **매일 진행되는 클라이언트 업데이트 후에도 재설치 불필요**:
   `Stable` 정식 버전과 `Insiders` 프리뷰 버전 모두 자동 업데이트 이후에도 한국어 인터페이스가 그대로 유지됩니다.
3. **「설정 → 모양(Appearance)」 내장 드롭다운으로 30ms 즉시 언어 전환**:
   재시작 없이 앱 내 `설정 → 모양 → 표시 언어` 메뉴에서 **한국어(1,920개 전체 항목 수록, VS Code 한국어판 기준 자연스러운 개발 용어)** 와 원본 영어(English) 및 14개 언어를 즉시 전환할 수 있습니다.
4. **100% 순수 텍스트 스크립트 · 외부 의존성 제로 · API 키 없는 신규 문구 자동 보완**:
   `.exe` / `.dll` 실행 파일 및 서드파티 `npm` 패키지가 전혀 없으며, 새 버전에서 추가된 영어 UI 버튼은 로컬 Antigravity를 통해 `dict/learned.ko.json`에 자동으로 번역·반영됩니다.

---

## 빠른 설치 (macOS / Windows / Linux)

공식 **Node.js >= 22.13.0** 환경이 필요합니다.

```bash
git clone https://github.com/CHANPAJN/antigravity-langpack.git
cd antigravity-langpack

# 한국어를 기본 언어로 설치
node cli.mjs install --lang ko

# macOS 선택 사항: Dock 전용 순수 셸 런처 생성
node cli.mjs install --lang ko --mac-launcher
```

- **제거 및 원본 영어 즉시 복원**: `node cli.mjs uninstall`

---

## 라이선스

[PolyForm Noncommercial License 1.0.0](../LICENSE) 라이선스를 따릅니다. 개인 사용 및 코드 감사는 무료이며, 상업적 재판매나 출처 삭제 후 재배포는 금지됩니다.

# Google Antigravity UI 현지화 규약 — 한국어 (`ko`)

Google Antigravity의 영어 UI 텍스트를 **소프트웨어 개발자에게 익숙한 현대적인 한국어 UI 표현 (VS Code 한국어판 기준)**으로 번역해 주세요.

## 1. 핵심 기술 용어 통일 (자연스러운 외래어 표기)
어색한 한자어 직역을 피하고 표준 외래어 표기를 사용합니다:
- `Agent` / `Subagent` -> `에이전트` / `서브에이전트`
- `Artifact` / `Artifacts` -> `아티팩트`
- `Side Question` -> `사이드 질문`
- `Workspace` -> `워크스페이스`；`Project` -> `프로젝트`
- `Sandbox` -> `샌드박스`；`Prompt` -> `프롬프트`；`Token` -> `토큰`
- `New Conversation` -> `새 대화`；`Settings` -> `설정`；`Customizations` -> `사용자 지정`；`Automations` -> `자동화`
- `Review` -> `코드 리뷰`；`Files Changed` -> `변경된 파일`；`Background Tasks` -> `백그라운드 작업`

## 2. 문체 및 띄어쓰기 규칙
1. **버튼 및 메뉴 항목**: 명사형으로 간결하게 작성하며 마침표를 찍지 않습니다 (`Proceed` -> `계속`, `Cancel` -> `취소`, `Save` -> `저장`).
2. **설명 문구**: 정중하고 명확한 `~합니다 / ~하세요` 체로 통일하며 한국어 띄어쓰기를 정확히 지킵니다.
3. **유지 항목**: 단축키(`(⌘D)`, `(Ctrl+D)`), 명령어(`/btw`, `/plan`), 고유명사(`Antigravity`, `Gemini`, `MCP`, `Worktree`)는 원문을 유지하고 모델 단계(`Low`, `High`, `Extra High`, `Orchestrator`)는 빈 문자열 `""`로 건너뜁니다.

## 3. 출력 형식
- 유효한 UTF-8 JSON 객체만 출력: `{"translations": {"Original English": "한국어 번역"}}` (HTML 태그 및 스크립트 금지).

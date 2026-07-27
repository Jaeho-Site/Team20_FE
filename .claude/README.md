# .claude — 이 저장소의 Claude Code 하네스

`reference/`의 학습 노트를 이 프로젝트에 적용한 결과물이다. 이 파일은 컨텍스트에 로드되지 않으므로 토큰 비용이 없다.

## 구성

```
CLAUDE.md                     항상 로드되는 프로젝트 지침 (약 70줄)
.claude/
  settings.json               권한 + hooks + statusline  ← 팀 공유, 커밋 대상
  settings.local.json         개인 오버라이드 (gitignore)
  hooks/
    guard-protected-files.mjs PreToolUse — 보호 파일 편집 차단 (exit 2)
    format-edited.mjs         PostToolUse — 편집한 파일만 prettier
    session-context.mjs       SessionStart(compact) — 압축 후 핵심 규칙 재주입
  statusline.mjs              모델·컨텍스트%·비용·5h 사용량 표시
  rules/                      경로 매칭 시에만 로드되는 규칙
    fsd-architecture.md         paths: src/**
    nextjs-workspace.md         paths: nextjs/**
    python-functions.md         paths: functions/**
  agents/                     격리 컨텍스트 워커 (요약만 반환)
    legacy-auditor.md           기술 부채 감사 (읽기 전용)
    migration-differ.md         src/ vs nextjs/src/ 드리프트 대조
    benchmark-runner.md         빌드·번들 측정 (로그 격리)
    code-reviewer.md            변경분 적대적 검토
  skills/                     호출 시에만 본문이 로드되는 절차
    analyze-legacy/             /analyze-legacy — 전체 분석 → docs/refactor/
    ab-compare/                 /ab-compare    — 정량 A/B 비교
    refactor-safely/            /refactor-safely — 검증 루프 강제
    smart-commit/               /smart-commit  — 사용자만 호출 가능
docs/refactor/TEMPLATE.md     측정 기록 양식
```

## 설계 근거 (reference 노트 대응)

| 결정 | 근거 |
|---|---|
| CLAUDE.md를 70줄로 유지 | 상시 로드 = 가장 비싼 컨텍스트. 코드에서 알 수 있는 것은 제외하고 함정만 남김 |
| 규칙을 `rules/`로 분리하고 `paths:` 지정 | 해당 파일을 만질 때만 로드 → 평소 컨텍스트 0 |
| 절차를 skill로 | 본문이 호출 시에만 로드됨. CLAUDE.md에 절차를 넣으면 매 요청 과금 |
| "편집 금지"를 hook으로 | CLAUDE.md 지침은 요청이고 hook은 보장. 결정론이 필요한 것만 코드로 내림 |
| subagent 4종 | 빌드 로그·대량 파일 읽기를 격리. 전부 "요약만 반환"을 프롬프트에 명시 |
| `smart-commit`에 `disable-model-invocation` | 부작용 있는 워크플로우는 사용자만 방아쇠를 당김 + 설명이 컨텍스트에서 빠짐 |
| package-lock.json Read deny | 303KB ≈ 8만 토큰. 의존성 확인은 `npm ls`로 |
| statusline | 컨텍스트% / 비용 상시 노출 → `/clear` 타이밍을 놓치지 않음. 로컬 실행이라 토큰 소비 0 |

## 적용하려면 재시작이 필요하다

`.claude/agents/`와 `.claude/skills/`는 **세션 시작 시점에 스캔**된다. 이 디렉토리들이 없던 상태에서 만들어졌으므로, 지금 세션에서는 subagent와 skill이 잡히지 않는다.

```
Claude Code를 종료하고 다시 실행 → /agents, /permissions 로 인식 확인
```

권한 규칙과 hooks는 재시작 없이 반영된다.

## 아직 하지 않은 것 (트리거가 오면 추가)

`reference/00-INDEX.md`의 "미리 쌓지 말 것" 원칙에 따라 의도적으로 비워 둔 것들:

| 신호 | 그때 추가할 것 |
|---|---|
| 브라우저에서 화면을 반복 확인하게 됨 | Playwright MCP (`claude mcp add playwright -- npx -y @playwright/mcp@latest`) |
| 타입 오류를 빌드까지 가서야 발견 | `/plugin install typescript-lsp@claude-plugins-official` |
| GitHub 이슈·PR을 계속 복붙 | GitHub MCP 또는 `gh` CLI 허용 규칙 |
| 같은 지시를 세 번 반복 | 새 skill |
| 같은 실수를 두 번 목격 | CLAUDE.md 한 줄 추가 → 반복되면 hook으로 승격 |

## 운영 습관

- 무관한 작업 사이에는 `/clear`. 긴 세션 하나보다 깨끗한 세션 여럿이 거의 항상 낫다.
- 세션 시작 시 모델·effort를 정하고 **작업 중에는 바꾸지 않는다** (캐시 전체 재구축).
- 접근이 불확실하거나 여러 파일을 건드리면 Plan Mode(`Shift+Tab` 2회)로 시작한다. 필요하면 `claude --permission-mode plan`.
- 분석·계획·측정치는 대화가 아니라 `docs/refactor/*.md`에 남긴다. 압축을 견디는 유일한 저장소다.

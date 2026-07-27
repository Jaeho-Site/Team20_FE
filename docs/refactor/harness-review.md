# Claude Code 하네스 리뷰 (2026-07-28)

> 대상: `CLAUDE.md` + `.claude/` 전체. 기준: 같은 토큰으로 최고의 결과를 내는 구조인가.
> 기능 지원 여부는 claude-code-guide 에이전트로 공식 문서(code.claude.com/docs) 대조 검증함.

## 총평

구조 설계는 문서화된 모범 사례와 거의 정확히 일치한다. 상시 로드(CLAUDE.md 70줄) / 경로 조건부(rules) / 호출 시 로드(skills) / 격리 컨텍스트(agents)의 4단 분리, "지침은 요청·hook은 보장" 구분, 요약만 반환하는 subagent 계약까지 토큰 효율 관점에서 흠잡을 데가 없다. **설계를 무효화하는 결함은 코드가 아니라 `settings.local.json` 한 파일에 있다.**

## 검증된 사실 (공식 문서 대조)

설계가 기대는 기능이 실제로 존재하는지가 이 리뷰의 첫 번째 질문이었다. 지원되지 않는 필드는 조용히 무시되므로.

| 가정 | 판정 |
|---|---|
| `rules/*.md`의 `paths:` frontmatter — 해당 파일 작업 시에만 로드 | ✅ 지원 (paths 없으면 상시 로드) |
| agent `memory: project` | ✅ 지원. 단, **Read/Write/Edit가 자동 추가됨** (아래 W-2) |
| skill `disable-model-invocation: true` — 호출 차단 + 설명도 시스템 프롬프트에서 제외 | ✅ 지원 (smart-commit이 스킬 목록에 안 뜨는 것으로 실증) |
| skill의 `argument-hint`, `allowed-tools`, `` !`cmd` `` 전처리 | ✅ 전부 지원 |
| statusline stdin의 `context_window.used_percentage`, `rate_limits.five_hour` | ✅ 정확한 필드명 |
| SessionStart `compact` matcher / PreToolUse exit 2 차단 | ✅ 지원 |
| 압축 후 CLAUDE.md 자동 재주입 | ✅ 됨 (session-context 훅은 보험 성격 — 유지 가치 있음) |

## Critical

### C-1. `settings.local.json`이 팀 설정의 권한 계층을 통째로 무력화한다

권한 파일 우선순위는 **local(3순위) > shared(4순위)** 이고, 파일이 다르면 shared의 `ask`가 local의 `allow`를 이기지 못한다. 즉:

- local의 `Bash(git *)` → settings.json이 `ask`로 묶어둔 `git push`, `git commit`, `git checkout`, `git reset --hard`가 **전부 무확인 통과**된다. deny의 `git push --force`도 같은 이유로 뚫릴 수 있다.
- `Bash(node *)`, `Bash(npx *)`, `Bash(sed *)`, `Bash(awk *)` → 임의 코드 실행·파일 변조가 무확인. `sed -i`나 `node -e`는 **Edit 툴을 안 거치므로 guard-protected-files 훅도 우회**한다. "hook은 보장"이라는 설계 문장이 이 조합에서 거짓이 된다.
- `Bash(npm install *)` → 임의 패키지 설치 무확인 (settings.json은 인자 없는 `npm install`만 허용하도록 신중히 좁혀놨는데 local이 되돌림).
- 23행의 `printf '%s' '{"tool_input":...routeTree.gen.ts...}'` — 훅 테스트하다 남은 쓰레기 항목.

**권고**: local은 "이 머신에서만 추가로 편한 것"(예: `Bash(claude plugin *)`)만 남기고 `git *`/`node *`/`npx *`/`sed *`/`awk *`/`npm install *`/printf 항목을 삭제. 자주 쓰는 안전한 조합이 필요하면 settings.json(팀 공유)에 좁은 패턴으로 승격.

## Warning

### W-1. 휘발성 사실이 3곳에 하드코딩 — 첫 리팩토링 직후 거짓말이 된다

"react-hook-form 사용처 0개", "TanStack Form은 auth hooks 4개 파일", "main.py 459줄" 같은 **현재 시점 스냅샷**이 CLAUDE.md(기술 부채 절), `ab-compare/SKILL.md`(사전 정보 절), `rules/python-functions.md`(구조 표)에 각각 박혀 있다. 이 수치들은 리팩토링의 **대상**이므로 반드시 변한다. 갱신을 잊으면 상시 로드되는 컨텍스트가 오히려 잘못된 전제를 주입한다.

**권고**: 스냅샷 사실의 정본을 `docs/refactor/00-analysis.md`(baseline) 하나로 정하고, CLAUDE.md·skill에는 "현황 수치는 docs/refactor/00-analysis.md" 한 줄만 남기거나, 각 수치 옆에 측정일을 붙여 stale 판별이 가능하게 한다.

### W-2. "읽기 전용" subagent는 실제로는 읽기 전용이 아니다

`memory: project`가 Read/Write/Edit를 자동 추가하므로 legacy-auditor 등 4개 agent 모두 실제 툴셋에 Write/Edit가 있다(에이전트 목록에서 확인됨). 게다가 Bash까지 있으므로 프롬프트의 "절대 고치지 않는다"는 요청이지 보장이 아니다 — README가 스스로 세운 "결정론이 필요한 것은 코드로 내린다" 기준과 어긋난다. C-1을 고치면 위험은 크게 줄지만, 구조적으로는 요청 수준임을 인지할 것.

### W-3. nextjs 검증 명령이 allowlist에 없다

`Bash(npm run ci)`는 `cd nextjs && npm run ci`와 매칭되지 않는다. 현재는 local의 광범위 allow가 이 구멍을 가리고 있지만, C-1을 고치는 순간 nextjs 검증·측정(benchmark-runner 포함)이 매번 프롬프트에 걸린다. **권고**: C-1 수정과 함께 settings.json에 `Bash(cd nextjs && npm install)`, `Bash(cd nextjs && npm run *)` 추가.

## Info (사소)

- guard 훅의 `routeTree\.gen\.ts$` 항목은 `\.gen\.ts$`에 포함되는 중복. 무해.
- `.claude/agent-memory/`를 gitignore했으므로 project memory는 머신 로컬에만 쌓인다. 솔로 작업이면 합리적 선택이나, 의도적인지 확인할 것.
- statusline·hooks 코드 품질, 실패 시 fail-open 처리(포맷 실패가 작업을 막지 않음), JSON 파싱 실패 시 정규식 폴백까지 모두 적절.
- skills 3종의 절차 설계(측정 전 판정 기준 확정, 1회 측정 금지, "억지 승자 금지", 리뷰어 억제 규칙)는 사후 합리화·환각 보고를 막는 장치로서 잘 짜였다.

## 다음 행동

1. ~~`settings.local.json` 정리 (C-1)~~ — **적용됨 (2026-07-28)**: 광범위 allow(`git *`, `node *`, `npx *`, `sed *`, `awk *`, `npm install *`, `python *`, `pnpm *`, `yarn *`)와 printf 잔재 삭제. `grep *`, `xargs wc -l`, `claude plugin *`, `corepack enable *`만 유지.
2. ~~settings.json에 nextjs 명령 allow 추가 (W-3)~~ — **적용됨 (2026-07-28)**: `cd nextjs && npm install/ci/ls` + run 스크립트 열거형(ci, lint, lint:fix, type-check, build, format, format:check). `npm run dev`는 루트와 동일하게 무확인 대상에서 제외.
3. 휘발성 수치의 정본 위치 결정 (W-1) — `/analyze-legacy` 실행으로 00-analysis.md를 만들 때 함께 처리하는 것이 자연스러움

# kspot-refactor

1년 전 만든 레거시 저장소를 리팩토링한다. 목표는 "동작하는 코드"가 아니라 **수치로 증명된 개선**이다.

## 이 저장소에서 하려는 것 (작업 우선순위 판단 기준)

1. TanStack 스택(Router / Query / Form)의 활용 방식을 정리하고, 대안(React Router, React Hook Form)과 **정량 비교**한다.
2. zod와 TanStack Form의 적절한 결합 지점을 확립한다.
3. 모든 변경은 before/after 수치와 함께 `docs/refactor/`에 기록한다. **수치 없는 "개선했다"는 결과물로 인정하지 않는다.**

측정 절차는 `/ab-compare` 스킬에 있다. 비교 실험을 시작하기 전에 반드시 호출할 것.

## 3개의 작업 공간 — 규칙이 서로 다르다

| 경로 | 정체 | 검증 명령 |
|---|---|---|
| `/` (루트) | Vite + React 19 + TanStack. **현재의 정본(source of truth)** | `npm run ci` |
| `/nextjs` | Vite → Next.js 마이그레이션 시도본. 독립 package.json | `cd nextjs && npm run ci` |
| `/functions/itinerary_theme` | Python GCP Cloud Function (Gemini LLM 호출) | 자동 검증 없음 |

- 루트와 `nextjs/`는 **같은 화면을 각각 구현한 중복 코드**다. 한쪽만 고치면 드리프트가 커진다. 어느 쪽을 고칠지 먼저 정하고, 다른 쪽은 의도적으로 두는지 명시할 것.
- 루트 `eslint.config.js`는 `nextjs/**`와 `functions/**`를 ignore한다. 루트 lint 통과는 nextjs 코드의 품질을 전혀 보증하지 않는다.

## 먼저 알아야 할 함정

- **`node_modules`가 설치돼 있지 않다.** 어떤 검증 명령이든 실행 전에 `npm install`(nextjs는 `cd nextjs && npm install`)이 필요하다.
- **단위 테스트 러너가 없다.** `npm test` 스크립트가 없고, vitest는 Storybook addon(브라우저 모드)으로만 붙어 있다. 실질 검증 수단은 `npm run ci`(lint + type-check + build)와 `npm run test:e2e`(Playwright, 서버·계정 환경변수 필요)뿐이다. 이 공백 자체가 리팩토링 대상이다.
- `src/routeTree.gen.ts`는 TanStack Router 플러그인 생성물이다. 직접 편집 금지 (편집 시도는 hook이 차단한다).
- `package-lock.json`은 읽기 금지(권한 deny). 의존성 버전 확인은 `npm ls <pkg>`로.
- `reference/`는 사용자의 Claude Code 학습 노트다. gitignore 대상이며 수정하지 않는다.

## 알려진 기술 부채 (분석의 출발점, 확정 사실)

- `react-hook-form`이 dependencies에 있으나 **사용처 0개**. `lucide`와 `lucide-react`도 중복 설치.
- TanStack Form은 `src/features/auth/hooks/` 4개 파일에서만 사용. nextjs 쪽에 같은 파일 4개가 중복 존재.
- `.github/workflows/e2e.yml`이 유일한 테스트 CI. 배포 워크플로우는 vite/nextjs 2벌.

## 코드 규약

- 아키텍처: FSD. `app → pages → features → entities → shared` 방향으로만 import한다. 역방향·동일 레이어 간 import 금지. 상세 규칙은 `.claude/rules/fsd-architecture.md`(해당 파일 작업 시 자동 로드).
- 경로 별칭: `@/shared/*`, `@/entities/*`, `@/features/*`, `@/pages/*`, `@/app/*`. 상대 경로 `../../` 금지.
- 각 슬라이스는 `index.ts`로 public API를 노출한다. 슬라이스 내부 파일을 밖에서 직접 import하지 않는다.
- Prettier: single quote, semi, 2-space, printWidth 100. 편집 후 hook이 자동 포맷하므로 손으로 맞추지 말 것.
- 환경변수는 `VITE_` 접두사(Vite) / `NEXT_PUBLIC_` (Next.js). `.env`는 읽기 금지.

## 커밋 / PR

- 커밋 메시지 형식: `type : 한글 설명` — **콜론 앞뒤에 공백**이 들어간다 (`refactor : useMemo 삭제`). type은 `feat|fix|refactor|chore|docs|ci|test`.
- 커밋·푸시는 사용자가 요청할 때만 한다. `main`에 직접 커밋하지 말고 브랜치를 먼저 만든다.
- PR 본문은 `.github/pull_request_template.md` 형식을 따른다.

## 작업 방식

- 여러 파일을 건드리거나 접근이 불확실하면 **먼저 계획한다**(Plan Mode). 오타 수정 같은 작은 변경은 건너뛴다.
- 리팩토링 전에 반드시 baseline 수치를 먼저 남긴다. 절차는 `/refactor-safely` 스킬.
- "완료" 보고에는 실행한 명령과 그 출력(증거)을 함께 낸다. 증거 없는 완료 보고 금지.
- 대량 탐색·로그 출력이 필요한 조사는 subagent(`legacy-auditor`, `migration-differ`, `benchmark-runner`)에 위임해 메인 컨텍스트를 지킨다.
- 분석 결과·계획·측정치는 대화에만 남기지 말고 `docs/refactor/*.md`에 쓴다. 컨텍스트 압축을 견디는 유일한 방법이다.

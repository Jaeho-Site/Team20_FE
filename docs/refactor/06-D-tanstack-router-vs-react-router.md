# [06] 실험 D — TanStack Router vs React Router (대표 라우트 서브셋)

> 작성일: 2026-07-29 · 대상: 루트 Vite · A안 커밋: `ceee891` (사전 작업 완료) / B안: 브랜치 `experiment/D-react-router`

## 0. 사전 작업 — 2-1·2-2 (착수 규칙에 따라 D의 before 측정 이전 완료)

00-analysis의 경고대로, 수동 단언 45% 상태로 D를 재면 "TanStack Router는 타입 이점 없다"는 거짓 결론이 나온다. 사전 작업 자체의 before/after:

| 지표                                               | before              | after                                       | 비고                                                    |
| -------------------------------------------------- | ------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `useParams`/`useSearch` 수동 `as` 단언             | 5곳 (11호출 중 45%) | **0**                                       | 파일 기반 라우트의 타입 추론이 그대로 성립 (tsc로 증명) |
| `validateSearch` 내부 `as` 캐스팅                  | 8곳                 | **0**                                       |                                                         |
| `validateSearch`에 zod (Standard Schema 직접 전달) | 0 / 8 라우트        | **8 / 8**                                   | `z.string().catch('')` 등으로 기존 폴백 의미 유지       |
| 수동 Search 타입 선언 (`type XSearch`)             | 4개                 | **0**                                       | 스키마에서 추론                                         |
| 인라인 `beforeLoad` 가드                           | 6곳 (각 5줄 복붙)   | **헬퍼 2개** (`requireAuth`/`requireGuest`) | `src/shared/lib/auth/routeGuards.ts`                    |
| 라우트 파일 diff                                   | —                   | **+39 / −97 (−58줄)**                       |                                                         |

검증: `npm run ci` green (테스트 18/18, build 성공) · Playwright 스팟체크 **6/6** — `/mypage`→로그인 가드, 게스트 가드, `/verify-email?token=abc`→`/auth/verified-email?token=abc` (토큰 유지), `/reset-password?token=abc` 리다이렉트, `/map` 파라미터 없이 렌더, **숫자형 토큰 문자열 복원**(아래).

### 0-B. 적대적 검토 결과 반영 (code-reviewer, Critical 1 / Warning 3 — 라이브러리 실측 기반)

- **Critical 반영 — 숫자형 토큰 무력화**: TanStack Router는 검색 파라미터를 JSON으로 먼저 파싱한다 — 백엔드 이메일 링크의 `?token=123456`(순수 숫자)은 **number**로 들어오고, `z.string().catch('')`는 이를 빈 문자열로 뭉개 인증·비밀번호 재설정을 차단한다 (기존 `as string` 코드는 템플릿 리터럴 문자열화로 우연히 동작). → `searchString`(`z.union([z.string(), z.number().transform(String)])`, `shared/lib/searchParams.ts`)으로 복원, 스팟체크 6번 케이스로 고정. **zod 전환이 "타입은 맞는데 런타임 의미가 달라지는" 함정의 실사례** — 실험 D 본 측정에서도 같은 검증을 B안에 적용해야 공정하다.
- **Warning 반영 — itineraryId**: 따옴표 없는 수동 URL(`?itineraryId=42`)에서 number → `catch(undefined)` → 일정 수정이 신규 생성으로 바뀌는 경로. `searchString` 적용으로 해소 (기존 코드보다 개선).
- **Warning 반영 — public API**: `routeGuards` 딥임포트 → `@/shared/lib/auth` 루트 export로 통일.
- **Warning 보고·결정 — FSD**: 가드의 리다이렉트 경로('/mypage', '/auth/login')가 shared에 있는 것은 엄밀히 pages의 지식이라는 지적. **"비로그인 사용자를 어디로 보내는가"는 인증 정책으로 보고 auth 슬라이스에 유지하기로 결정** — shared/lib/auth의 기존 레이어 위반 정리(P4-1) 때 재배치를 재검토한다.

## 1. 무엇을 비교하는가

TanStack Router 선택의 핵심 근거(라우트 파라미터 타입 추론·검색 파라미터 검증)가 React Router 대비 실제로 정량 우위인지. **전면 마이그레이션 금지**(goals.md) — 대표 라우트 서브셋으로 범위를 고정한다.

## 2. 실험 설계

- **A안**: `@tanstack/react-router` 1.132.x — 사전 작업 완료 상태 (zod validateSearch 8/8, 단언 0)
- **B안**: React Router (최신 안정판) — **대표 라우트 3개**를 실험 브랜치에서 동일 구현:
  1. `/content/$contentId/map` — 동적 path param + optional search param
  2. `/verify-email` → `/auth/verified-email` — search param 검증·유지 리다이렉트 체인
  3. `/mypage` — 인증 가드
- **동일 조건**: 같은 화면 컴포넌트, 같은 zod 스키마(검색 파라미터), 같은 가드 의미론, 같은 빌드 설정(라우터별 청크 분리)
- **판정 기준 (측정 전 고정)**:
  - **B안 채택 검토 조건 (전부 충족해야)**: 라이브러리 기여분 gzip 5KB 이상 절감 + 대표 라우트에서 단언 0 유지 가능 + 구현 코드량 +15% 이내 + 동작 스팟체크 5/5
  - 그 외 → **TanStack Router 유지** (채택 근거가 수치로 확정됨)
  - gzip 3KB 미만 차이는 "유의미한 차이 없음"

## 3. 측정 지표와 방법

| #   | 지표                    | 방법                                                                                                 | 신뢰도 |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| 1   | 라이브러리 기여분 gzip  | manualChunks 분리 청크 (A안 tanstack-router **21.39 KB** 확보됨)                                     | 높음   |
| 2   | 동일 라우트 구현 코드량 | 대표 3라우트의 라우트 정의+가드+검증 코드 `wc -l` (A안: routeTree.gen.ts 442줄은 생성물로 별도 계상) | 높음   |
| 3   | 타입 안전성             | 수동 단언·수동 타입 선언 수 (A안 0), params/search가 라우트 정의만으로 추론되는지                    | 높음   |
| 4   | 동작 동등 게이트        | Playwright 스팟체크 5케이스 (§0과 동일 스크립트)                                                     | 높음   |

## 4. 결과

### 4.1 범위 확정 과정에서의 핵심 실측 (설계를 바꾼 발견)

**하위 레이어 22개 파일이 `@tanstack/react-router`를 직접 import한다** (`grep -rln`, features 19 + shared 3 — Header의 Link, auth 훅들의 useNavigate, FormNavigation 등). 실화면 바디를 RR 서브셋에서 재사용하면 이 22개를 전부 고쳐야 렌더가 성립 = 전면 마이그레이션(goals.md 금지). → B안은 **배선 계층(가드·검색 검증·params)만 실구현 + 스텁 바디**로 확정. **라우터 전환 비용의 실체는 라우트 파일 19개가 아니라 하위 레이어 22개 파일이다.**

### 4.2 지표별 결과

| 지표                                  | A안 TanStack Router                                                              | B안 React Router 7.18                                                                                                 | 차이                             | 신뢰도 |
| ------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------ |
| 라이브러리 기여분 gzip                | **21.39 KB** (+공유 store 1.46)                                                  | **31.0 KB** (react-vendor delta 31.03 / 별도 청크 30.80 — 두 방법 교차 일치)                                          | **RR +9.4 KB (+44%)**            | 높음   |
| 라우트 배선 코드 (대표 3라우트, 근사) | 약 54줄 (라우트 블록 + 공유 가드·스키마 지분) + `routeTree.gen.ts` 442줄(생성물) | 약 73줄 (스텁 제외 배선 순수분) — `useValidatedSearch`·`RequireAuth` **재발명 포함**                                  | RR 약 +35% (근사 — 산출 방식 §9) | 중간   |
| 타입 안전성                           | 단언 0, params/search **전부 추론**, 경로 문자열 오타는 컴파일 에러              | `as` 0 (런타임 내로잉 1회로 회피)이나 **params가 `string \| undefined`**, search 스키마 배선 수동, 경로 문자열 무검증 | A안 우위 (구조적)                | 높음   |
| 동작 스팟체크                         | 6/6 (사전 작업 §0)                                                               | **5/5** (가드·리다이렉트 체인·숫자형 토큰·params)                                                                     | 동등                             | 높음   |

### 4.3 부수 실측 2건

- **숫자형 토큰 비대칭**: RR은 URLSearchParams 기반이라 `?token=123456`이 항상 문자열 — §0-B의 JSON 파싱 함정이 **구조적으로 없다**. TanStack의 JSON 파싱은 타입 있는 검색 파라미터의 대가다 (`searchString`으로 관리 가능하나 알아야 하는 함정).
- **청크 분리 함정**: react-router를 별도 청크로 찢으면 모듈 최상위 `createContext`가 react 초기화 전에 실행돼 앱이 죽는다(실측, `Cannot read properties of undefined (reading 'createContext')`). react-vendor 합류 + delta 측정으로 우회 — 두 측정 방법의 수치가 30.8/31.0KB로 일치해 신뢰도를 교차 확보했다.

## 5. 해석

- **판정: B안 불채택 → TanStack Router 유지 확정.** 사전 기준(RR gzip 5KB 이상 절감 필수)과 정반대로 RR이 **+9.4KB 더 무겁다**. "React Router가 표준이고 가볍다"는 통념이 이 조건에서 역전 — 실험 B(RHF)와 같은 패턴의 결과다.
- 타입 안전성 축은 사전 작업(2-1)이 전제였음이 재확인됐다: 단언 45% 상태였다면 A안의 "전부 추론" 우위가 수치에 나타나지 않았을 것이다.
- 전환 비용의 실체(하위 레이어 22파일)는 goals.md가 전면 마이그레이션을 금지한 판단을 실측으로 정당화한다.

## 6. 정성 평가 (수치 아님)

- RR에는 validateSearch·라우트 컨텍스트 가드·전역 라우트 타입(Register)이 없다 — 같은 의미론을 얻으려면 `useValidatedSearch`, `RequireAuth`를 손수 만들어야 했고, 이는 앱마다 재발명되는 비공식 관례다.
- TanStack의 파일 기반 라우팅 + 생성물(routeTree 442줄)은 "공짜 타입"의 비용 — 빌드 파이프라인 의존이 생긴다. RR은 생성물이 없다.
- 스텁이라 데이터 로딩(loader) 축은 비교하지 못했다 — 측정하지 않음으로 기록.

## 7. 결론과 다음 행동

- **채택: A안 (TanStack Router 유지).** 근거: 번들 −9.4KB, 타입 안전성 구조 우위, 전환 비용 22파일. B안 구현은 `experiment/D-react-router` 브랜치에 보존.
- 이로써 **goals.md 실험 A~D 전부 완료.** 남은 트랙: Phase 2 잔여(2-4~2-7), Phase 4 독립 트랙(functions 분해 등).

## 8. 이력서 문장 (goals.md 이력서 지표)

- TanStack Router vs React Router를 배선 서브셋으로 실측 비교 — RR이 오히려 +9.4KB(+44%) 무겁고 params 추론·검색 검증을 재발명해야 함을 확인, 라우터 선택을 수치로 확정
- 라우터 전환 비용의 실체가 라우트 파일이 아니라 하위 레이어 22개 파일의 결합임을 실측 — "부분 마이그레이션 실험" 설계로 전면 전환 없이 의사결정 근거 확보

## 9. 재현 방법

```bash
# A안 (refactor/phase2-router-prep)
npm install && npm run ci                     # 사전 작업 검증 (18/18, build)
npm run build                                 # tanstack-router 청크 21.39KB gzip은 빌드 출력에서

# B안
git switch experiment/D-react-router && npm install
npm run build                                 # react-vendor 89.79KB — A안 서브셋의 58.76KB와의 delta가 RR 기여분
# 별도 청크 실측(30.80KB)은 vite.config의 react-router 규칙을 'react-router-lib' 반환으로 바꾸면 재현
# (단, 그 상태로는 청크 초기화 순서 문제로 앱이 안 뜬다 — §4.3)

# 배선 코드량 산출 방식: B안 = RrAppRouter.tsx 95줄 + RrApp.tsx 17줄 중 스텁 표시부 제외 약 73줄.
# A안 = 대표 3라우트의 createFileRoute 블록 + verify-email 리다이렉트 컴포넌트 + requireAuth·searchString 공유 지분 약 54줄.
# 결합 실측: grep -rln "@tanstack/react-router" src/features src/shared src/entities  → 22파일
```

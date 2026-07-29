# [06] 실험 D — TanStack Router vs React Router (대표 라우트 서브셋)

> 작성일: 2026-07-29 · 대상: 루트 Vite · A안 커밋: (사전 작업 커밋 후 기입) / B안: 미착수

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

(측정 후 기입)

## 5. 해석

(측정 후 기입)

## 6. 정성 평가 (수치 아님)

(측정 후 기입)

## 7. 결론과 다음 행동

(측정 후 기입)

## 8. 이력서 문장 (goals.md 이력서 지표)

(측정 후 기입)

## 9. 재현 방법

```bash
npm install && npm run ci                     # 사전 작업 검증
npm run build                                 # tanstack-router 청크 gzip은 빌드 출력에서
# 가드·리다이렉트 스팟체크: docs/refactor/06 문서의 §0 케이스 5개 (스크립트는 실험 브랜치에 포함 예정)
```

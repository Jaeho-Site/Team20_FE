# 레거시 분석 (2026-07-29)

> 대상: 저장소 전체 (루트 Vite / nextjs / functions) · 커밋: `b83d108` · branch `main`
> 우선순위 기준: [`goals.md`](./goals.md). 각 부채 항목에 대응 실험(A~D)을 표시한다.

조사 방식: 5개 subagent 병렬 위임 — 루트 `src/` 부채 감사, TanStack/zod 사용 실태, `src/` vs `nextjs/src/` 드리프트, `functions/` 파이썬 감사, baseline 측정(실제 `npm install` + `npm run ci` 실행).

---

## 1. 현황 수치 (baseline)

### 1.1 코드 규모

| 지표                              | 값                                         |
| --------------------------------- | ------------------------------------------ |
| 루트 `src/`                       | 319 파일 / 15,651줄                        |
| `nextjs/src/`                     | 337 파일 / 16,427줄                        |
| `functions/itinerary_theme/`      | 6 파일 / 1,257줄                           |
| 두 워크스페이스 공통 경로 파일 쌍 | 273쌍                                      |
| — 바이트 단위 완전 동일           | 46쌍                                       |
| — 내용 차이 있음                  | 227쌍 (트리비얼 105 / 논트리비얼 122)      |
| 루트에만 있는 파일                | 82개                                       |
| nextjs에만 있는 파일              | 80개 (`ai-itinerary` 계열 약 1,538줄 포함) |

### 1.2 빌드·검증 (cold 캐시, 실측)

| 단계                 | exit code    | 소요                               |
| -------------------- | ------------ | ---------------------------------- |
| `npm install`        | 0            | 121초 (529 패키지)                 |
| `npm run lint`       | **1 (실패)** | 84초 — 31 errors                   |
| `npm run type-check` | 0            | 3초                                |
| `npm run build`      | 0            | 156초 (`vite build` 자체는 47.3초) |

**`npm run ci`는 현재 통과하지 않는다.** lint 31건은 전부 `.claude/hooks/*.mjs`·`.claude/statusline.mjs`의 `no-undef 'process'` — `src/` 코드 문제가 아니라 eslint config에 `.claude/**`용 Node 전역이 빠진 harness 설정 이슈다.

### 1.3 번들 (`dist/`)

| 지표                               | raw         | gzip          |
| ---------------------------------- | ----------- | ------------- |
| dist 전체                          | 5,392,225 B | 4,736,563 B   |
| `assets/index-*.js` (단일 JS 청크) | 714,575 B   | **211,239 B** |
| `assets/index-*.css`               | 139,813 B   | 19,458 B      |
| 문서용 PNG (`public/` 유래, 실측)  | 3,674,555 B | —             |

- JS/CSS 청크는 **3개뿐**. `manualChunks` 설정이 없어 vendor 코드가 앱 코드와 한 덩어리다. Vite가 "chunks larger than 500 kB" 경고를 낸다.
- dist 총량의 **약 68%(3,674,555 B, `du -sb public/` 실측)가 README용 문서 이미지**(`2-FSD.png`, `3-ServiceTheme.png`, `4-storybook.png`, `k8s.png`, `ai동선.png` 등 PNG 9개)다. 프로덕션 빌드에 그대로 들어간다. (초기 조사의 "약 4.53MB / 84%"는 과대 — 차액 약 0.86MB는 `src/` 유래로 추정되는 별도 이미지 자산이며, 문서 이미지가 아니라면 노이즈가 아니라 실제 앱 자산이다. Phase 0-5 재측정 시 dist 이미지의 출처를 분리 계상할 것.) `public/mockServiceWorker.js`(MSW 워커)도 프로덕션 dist에 포함된다.

### 1.4 의존성

| 지표                                    | 값                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------- |
| direct dependency (dep + devDep)        | 54개                                                                   |
| `react-hook-form`                       | 7.62.0 설치 — 사용처 0 (실험 B의 재료)                                 |
| `lucide` / `lucide-react`               | 0.542.0 / 0.542.0 — 중복 설치                                          |
| `zod`                                   | 루트 4.1.5, `@tanstack/router-plugin` 하위에 3.25.76 — **메이저 혼재** |
| `@tanstack/react-form` / `react-router` | 1.23.5 / 1.132.2                                                       |

### 1.5 검증·부채 지표

| 지표                               | 값                                        |
| ---------------------------------- | ----------------------------------------- |
| 단위 테스트 파일                   | **0개**                                   |
| e2e spec 파일 / 커버 라우트        | 2개 / **4 of 19 라우트 (21%)**            |
| Storybook story 파일               | 49개 (회귀 테스트 아님)                   |
| FSD 역방향 import                  | 2건                                       |
| 동일 레이어 교차 import            | 22건 / 17파일                             |
| `index.ts` 우회 딥임포트           | 80건                                      |
| `../../` 상대경로                  | 96건 / 57파일                             |
| `as any` (프로덕션)                | 11건 — 절반이 `MapSection/model/utils.ts` |
| `: any` / `any[]`                  | 6건 / 4파일                               |
| console.log (프로덕션)             | 0건 (`*.stories.tsx`에만 존재)            |
| 데드 코드 `src/stories/StyleTest/` | 1,370줄 (프로덕션 번들 **미포함**)        |
| `useForm` 사용 파일                | 4개 (전부 auth), 평균 40줄                |
| `useQuery` 계열 호출               | 30개 / 11파일 — 인라인 queryKey 9개       |
| 라우트                             | 19개 (`routeTree.gen.ts` 442줄)           |
| `useParams`/`useSearch` 수동 `as`  | 5 of 11 (45%)                             |

---

## 2. 발견 사항 (우선순위 순)

우선순위 기준: ① 정확성 위험 → ② 변경을 막고 있는 것 → ③ 목표(TanStack/zod) 직결 → ④ 정리.
`실험` 열은 해당 항목이 goals.md의 어느 실험의 **사전 작업**인지를 뜻한다. `—`는 실험과 무관한 독립 부채다.

> **[상태 갱신 2026-07-29]** Phase 0 전체(P0-1~P0-4) **완료** — 결과·수치는 [`01-baseline.md`](./01-baseline.md).

### [P0-1] `npm run ci`가 실패 상태 — 회귀 판정 수단이 없다 · 실험 A B C D

- 근거: lint exit 1, 31 errors (`.claude/hooks/*.mjs`, `.claude/statusline.mjs`)
- 영향: 유일한 자동 검증 수단이 빨간불이다. 이 상태에서 낸 before/after 수치는 "리팩토링 때문에 깨진 것"과 "원래 깨져 있던 것"을 구분할 수 없다. **모든 실험의 절대 선행 조건.**
- 측정 지표: lint error 31 → 0, `npm run ci` exit 1 → 0
- 예상 규모: S (eslint config에 `.claude/**` Node 전역 블록 추가)

### [P0-2] 단일 JS 청크 — 실험 B·D의 핵심 지표를 측정할 수 없다 · 실험 B D

- 근거: `dist/assets/index-*.js` 714.6KB 단일 파일, vite config에 `manualChunks` 없음
- 영향: goals.md가 실험 B·D의 지표로 지정한 **"라이브러리 기여분 gzip"을 현재 구조에서는 산출할 수 없다.** 폼 라이브러리를 바꿔도 전체 번들 gzip 211KB의 변화분으로만 추정해야 하는데, 그 차이는 앱 코드 변경과 뒤섞인다.
- 측정 지표: JS 청크 1개 → vendor 분리 후 N개, `@tanstack/react-form` / `@tanstack/react-router` 개별 청크 gzip bytes 확보 여부
- 예상 규모: S~M (`build.rollupOptions.output.manualChunks`)

### [P0-3] 번들 수치의 68%가 문서 이미지 노이즈 · 실험 B D

- 근거: dist 5.39MB 중 3,674,555 B(68%)가 `public/`의 README용 PNG 9개 (실측. 초기 조사의 "약 4.53MB / 84%"는 과대 — §1.3 참조)
- 영향: "번들이 줄었다"를 총 dist 크기로 말할 수 없다. (검증 결과 정정: 실험 C는 nextjs에서 수행하고 `nextjs/public/`에는 문서 이미지가 없으므로, 초기 조사의 "실험 C 측정 환경 오염" 주장은 사실이 아니다. 이 항목은 실험 B·D의 번들 지표에만 관련된다.)
- 측정 지표: dist 총 크기 5,392,225 B → (문서 이미지 제외 후) 예상 약 1,720,000 B (남는 약 0.86MB 이미지의 출처가 `src/` 앱 자산인지 재측정 시 확인)
- 예상 규모: S (문서 이미지를 `docs/`로 이동하거나 빌드 제외)

### [P0-4] 단위 테스트 러너 부재 — 폼·스키마 회귀를 잡을 수단이 없다 · 실험 A B

- 근거: `npm test` 스크립트 없음, vitest는 Storybook addon(브라우저 모드)으로만 연결, `src/**` 테스트 파일 0개, e2e spec 2개가 커버하는 라우트는 4/19 (21%)
- 영향: 실험 A·B는 zod 스키마와 폼 검증 로직을 직접 뜯어고치는 작업이다. e2e(Playwright)는 서버·계정 환경변수가 필요해 반복 실행 비용이 크고, 스키마 단위의 검증 동작을 좁게 잡아내지 못한다. 게다가 auth 라우트는 e2e가 커버하는 4개 중 2개에 들어가지만, 커버가 곧 검증 밀도는 아니다.
- 측정 지표: 테스트 파일 0개 → auth 스키마 4개에 대한 케이스 N개, `npm test` 스크립트 존재 여부
- 예상 규모: M (vitest node 환경 분리 설정 + 스키마 테스트 작성)
- **판단 보류 항목** — §4 참조 (실험보다 먼저 할지 사용자 결정 필요)

### [P1-1] Cloud Function이 매 요청마다 외부 디버그 API를 호출한다 · 실험 —

- 근거: `functions/itinerary_theme/main.py:122-129` (`https://httpbin.org/ip`, 타임아웃 5초)
- 영향: 정확성·지연 위험. 모든 사용자 요청 경로에 외부 서드파티 의존이 걸려 있다. httpbin이 느리면 그만큼 응답이 늦는다. 디버깅 잔재로 보인다.
- 측정 지표: 요청당 외부 호출 1회 → 0회, p50 지연 감소분(측정 필요)
- 예상 규모: S · 위험도: 중간

### [P1-2] 내부 예외 메시지가 그대로 API 응답에 노출된다 · 실험 —

- 근거: `functions/itinerary_theme/main.py:159, 325, 379, 401, 455` (`f'...: {str(e)}'`), `function-config.yaml:18` (`allow-unauthenticated`)
- 영향: 인증 없이 열린 엔드포인트가 DB/내부 예외 문자열을 그대로 반환한다. 정보 노출.
- 측정 지표: 예외 문자열 노출 지점 5개 → 0개 (로그로만 남기고 응답은 일반 메시지)
- 예상 규모: S · 위험도: 낮음~중간

### [P1-3] nextjs 쪽 드리프트 5건이 기능 결함으로 남아 있다 · 실험 C

- 근거: `nextjs/src/entities/itinerary/api/queryfn.ts` (`useDeleteItinerary` 훅 자체가 없음), `nextjs/src/features/UserInfo/ui/MyPage.tsx` (API 직접 호출 + `alert()`), `nextjs/src/features/Sidebar/model/utils.ts` (`for...of` 순차 await — 루트는 `Promise.allSettled` 병렬)
- 영향: 루트가 PR #106/#111에서 반영한 개선이 nextjs에 이관되지 않았다. nextjs는 "뒤처진 사본"이다(단, §2 P3-1 참조 — 한편으로는 앞선 축이기도 하다). 실험 C를 nextjs에서 수행하기로 한 이상, 실험장이 결함 상태면 LCP·CLS 측정에 교란이 섞인다.
- 측정 지표: 기능 결함성 드리프트 5건 → 0건, `alert()` 사용 1곳 → 0곳, Sidebar 페치 순차 → 병렬
- 그 외 2건: `nextjs/src/entities/location/api/locationApi.ts` 폴백 객체 복붙(루트는 헬퍼로 통합), `nextjs/src/shared/lib/auth/AuthContext.ts` "Temporary types" 주석과 함께 남은 타입 재정의(실제로는 `nextjs/src/entities/auth/model/types.ts`에 동일 타입이 이미 존재 — 죽은 코드)
- 예상 규모: M

### [P2-1] TanStack Form에 zod를 연결하는 공식 경로를 한 곳도 쓰지 않는다 · 실험 A B

> **[정정·해소 2026-07-29 → [`04-A`](./04-A-zod-tanstack-form.md)]** 구조 진단(이중 배선)은 정확했으나, **"필드별 메시지가 뭉개진다"는 함의는 UI 계측으로 반증됨** — field-level 이중 배선이 보상해 UI는 6/6 정상 표시하고 있었다. 이중 배선 자체는 실험 A로 해소(9곳→0).

이 저장소의 핵심 관심사에 정면으로 걸리는 항목이다.

- 근거: `src/features/auth/hooks/useLoginForm.ts:15-24` (form-level `validators.onChange`가 `loginSchema.parse(value)`를 try/catch로 감싸고 **항상 `'입력값을 확인해주세요'` 하나만** 반환), `src/features/auth/hooks/useFormValidation.ts:41-49` (field-level에서 `loginSchema.shape.email`을 **또 한 번** 별도 parse), `src/features/auth/ui/LoginForm.tsx:15-16`
- 영향: 같은 스키마를 form-level과 field-level에서 두 메커니즘으로 이중 배선했다. 그 결과 zod 스키마에 적어둔 필드별 메시지(예: `'비밀번호는 8자리 이상이어야 합니다'`)가 form-level 검증에서는 버려지고 제네릭 메시지로 대체된다. **실험 A는 정확히 이 지점을 대상으로 한다.**
- 측정 지표:
  - `validators: { onChange: schema }` 직접 바인딩 **0개** → 4개
  - `ValidatorConfig` 인터페이스 글자 그대로 중복 정의 **2곳** (`useFormValidation.ts:5-10`, `fieldConfigs.ts:4-9`) → 1곳
  - 폼당 코드 줄 수: useLoginForm 39 / useSignupForm 42 / usePasswordResetForm 39 / usePasswordResetRequestForm 40 (평균 40줄)
- 예상 규모: M

### [P2-2] 스키마와 defaultValues에 필드를 이중 선언하고 `as`로 잇는다 · 실험 A

> **[해소 2026-07-29 → [`04-A`](./04-A-zod-tanstack-form.md)]** 단언 4곳·any 5곳 → 0. defaults는 스키마 파일에 콜로케이트.

- 근거: `src/features/auth/hooks/useLoginForm.ts:11-14` (`defaultValues: { email: '', password: '' } as LoginFormData`), `src/features/auth/model/schemas.ts:3-9` (같은 필드를 zod로 재선언), 동일 패턴이 `useSignupForm.ts:11-16`, `usePasswordResetForm.ts:11-14`, `usePasswordResetRequestForm.ts:14-16`
- 영향: zod 스키마가 단일 출처(single source of truth)가 아니다. 필드를 추가하면 두 곳을 고쳐야 하고, 타입 단언이 그 불일치를 가려준다.
- 측정 지표: 이중 선언 지점 **4개** → 0개, `as XFormData` 단언 **4개** → 0개, 폼 관련 `any`/`@ts-ignore` **5개**(`fieldConfigs.ts` 2, `FormFieldRenderer.tsx` 1, `useFormValidation.ts` 2) → 감소분
- 예상 규모: M

### [P2-3] `useParams`/`useSearch` 호출의 45%가 수동 타입 단언 · 실험 D

- 근거: `src/pages/verify-email.tsx:19` (`Route.useSearch() as VerifyEmailSearch`), `src/pages/content.$contentId.map.tsx:39` (`Route.useParams() as { contentId: string }`), `src/pages/reset-password.tsx:12` (`validateSearch`에서 `search.token as string` — zod가 있는데도 안 씀)
- 영향: TanStack Router를 선택한 가장 큰 이유(라우트 파라미터 타입 추론)가 절반 무력화돼 있다. **이 상태로 실험 D를 하면 "TanStack Router는 타입 안전성 이점이 없다"는 잘못된 결론이 나온다.** 비교 전에 반드시 정상 사용 상태로 되돌려야 공정한 측정이 된다.
- 측정 지표: `useParams`/`useSearch` 호출 **11곳 중 수동 `as` 5곳(45%)** → 0곳, `validateSearch`에 zod 적용 라우트 0개 → N개
- 예상 규모: M

### [P2-4] 라우트 가드가 6개 파일에 복붙돼 있다 · 실험 D

- 근거: `src/pages/auth/login.tsx:6-10`, `src/pages/mypage.tsx:8-12`, `src/pages/auth/reset-password.tsx:6-10` (그 외 signup, signup-success, forgot-password)
- 영향: `context.auth.isLoggedIn` 체크가 `requireAuth`/`requireGuest` 같은 헬퍼 없이 라우트마다 인라인 반복된다. 실험 D의 "동일 라우트 구현 코드량" 지표를 재기 전에 정리하지 않으면, 보일러플레이트가 TanStack Router의 코드량으로 잘못 계상된다.
- 측정 지표: `beforeLoad` 사용 라우트 **6개**, 가드 중앙화 지점 **0개** → 1개 · 라우트 19개 / `routeTree.gen.ts` 442줄 (라우트당 23줄 생성 코드) · `loader` 사용 1개
- 예상 규모: S

### [P2-5] auth 밖의 폼은 zod도 TanStack Form도 쓰지 않는다 · 실험 A B (범위 경고)

- 근거: `src/pages/contact.tsx:135-245` (순수 HTML `<form onSubmit>`, **필드 값 수집조차 하지 않고** 검증 없이 토스트만 띄움 — API 연동 없음), `src/features/RoutePlanning/ui/SaveRouteModal/SaveRouteModal.tsx:56-84` (`useState` + 수동 `onChange`, zod 없음)
- 영향: 폼 구현이 3갈래(TanStack Form+zod / useState 수동 / 미구현 HTML)로 갈려 있다. **실험 A·B의 대상은 auth 4개 폼으로 한정해야 한다.** contact.tsx는 API 연동이 없어 폼 비교 baseline으로 쓰면 안 된다.
- 측정 지표: `useForm(` 사용 파일 4개(전부 auth), zod 스키마 파일 2개 · 표준 미적용 폼 2곳
- 예상 규모: M (실험 A·B 이후 별도 트랙)

### [P2-6] 서버 상태를 `useEffect`로 직접 페치하는 곳이 남아 있다 · 실험 —

- 근거: `src/features/Sidebar/model/hooks/usePopularContents.ts:12-30` (`useState`+`useEffect`, 캐시 없음, 매 마운트 재요청), `src/entities/content/api/queryfn.ts:7-12` (**같은 이름의 훅**이 `useSuspenseQuery` + `contentQueryKeys.popular()`로 이미 존재), `src/features/auth/hooks/useEmailVerification.ts`
- 영향: 동명 훅 2벌 중 한쪽만 캐시를 쓴다. 어느 쪽을 import했는지에 따라 동작이 달라진다.
- 측정 지표: `useEffect`+직접 fetch **2곳** → 0곳, 동명 훅 중복 2벌 → 1벌
- 예상 규모: S

### [P2-7] queryKey 인라인 리터럴 9곳, 그중 2곳은 기존 중앙 키와 충돌 · 실험 —

- 근거: `src/features/UserInfo/hooks/useMyPageData.ts:6` 및 `src/entities/itinerary/api/queryfn.ts:39,57,73` (전부 `['mypage']`), `src/features/LocationImageCarousel/hooks/useLocationData.ts:8` (`['content-locations', contentId]` — `src/entities/content/api/queryKeys.ts:7`에 `contentQueryKeys.locations()`가 이미 있는데 안 씀)
- 영향: 폼 mutation 성공 후 invalidate 대상이 어긋날 수 있다. 실험 A·B가 mutation 경로를 건드리므로 정합성에 간접 영향.
- 측정 지표: `useQuery` 계열 호출 **30개**(11파일) 중 인라인 queryKey **9개** → 0개, `mypageKeys` 부재 → 신설, `staleTime` 오버라이드 1/30
- 예상 규모: S~M

### [P3-1] nextjs에만 있는 `ai-itinerary` 1,538줄 — "nextjs=뒤처진 사본" 전제가 성립하지 않는다 · 실험 C

- 근거: `nextjs/src/entities/ai-itinerary/`, `nextjs/src/features/ai-itinerary/`, `nextjs/src/features/itinerary/`, `nextjs/src/app/ai-itinerary/**`
- 영향: 루트에 대응 코드가 전혀 없는 신규 기능이다. 루트를 정본으로 고정하면 이 기능의 처리(역이식 / nextjs 전용 유지 / 폐기)를 별도로 결정해야 한다. `functions/itinerary_theme`(Gemini 호출)의 실제 소비자일 가능성이 높다.
- 측정 지표: nextjs 전용 파일 80개 중 ai-itinerary 계열 약 1,538줄
- 예상 규모: L (역이식 시) · **판단 보류 항목** — §4 참조

### [P3-2] 실험 C는 지금 바로 시작할 수 있다 (준비 완료) · 실험 C

> **[완료·정정 2026-07-29 → [`03-C`](./03-C-next-image.md)]** 실험 C 완료(next/image 채택, 이미지 bytes 최대 −88.7%). **정정**: "`<img>` 3곳"은 불완전한 목록이었다 — 캐롤셀에 `next/image + unoptimized` 2곳이 더 있었고(03-C §6-B), 잔여 unoptimized 3곳(PosterCard·PlaceThumbnail·ContentCard)은 미전환 후속 후보로 남아 있다.

- 근거: `nextjs/next.config.ts` (`images.remotePatterns` 5개 호스트 이미 설정), `<img>` 잔존 3곳 — `LocationHero.tsx`, `LocationRelatedContents.tsx`, `ContentOverviewHeroClient.tsx` (**전부 `// eslint-disable-next-line @next/next/no-img-element` 주석으로 우회 중**), `next/image` 사용 8곳
- 영향: 부채가 아니라 **기회**다. 인프라가 이미 전환 대상 3곳을 명시적으로 표시해 두었고, 이미지가 전부 백엔드 동적 외부 URL이라 remotePatterns가 실제로 필요한 조건도 충족한다.
- 측정 지표: `<img>` 3곳 → `next/image` 3곳, LCP / 이미지 전송 bytes / CLS / webp·avif 협상 여부
- 예상 규모: S (전환) + M (측정)

### [P3-3] `functions/main.py` — 엔트리포인트 하나가 파일의 76% · 실험 —

- 근거: `functions/itinerary_theme/main.py:110-459` (`generate_itinerary` 350줄), 나머지 함수 3개는 15~23줄
- 영향: 책임 11개(CORS/OPTIONS, 디버그 IP 조회, JSON 파싱, 필드·enum 검증, 허브 검증, DB 조회+커넥션 관리, 지오 필터링, 프롬프트 생성, Gemini 호출, 응답 포맷, 최상위 예외)가 한 함수에 있다. 최대 중첩은 3단계로 얕아서 분해 자체는 어렵지 않다.
- 측정 지표: main.py 459줄 / 함수 4개 / 최대 함수 350줄 → 4~5모듈 분해 시 **최대 파일 약 140줄** · 타입 힌트 커버리지 **4/19 (21%)** · 죽은 함수 2개 53줄(`db.py:109-134`, `137-163`) · 테스트 0개 · requirements.txt 5개 중 정확한 버전 고정 **0개**, 무제약 1개(`cryptography`) · `function-config.yaml` timeout 값 불일치 2곳(24행 300s vs 95행 주석 60s)
- 예상 규모: L · 위험도: 검증 수단이 0이라 리팩토링 위험이 높음 → 분해 전에 최소한의 테스트가 필요

### [P4-1] FSD 레이어 위반 — 상대경로 96건, 딥임포트 80건 · 실험 —

- 근거: `src/shared/lib/auth/AuthContext.ts:2` (shared → entities, 역방향), `src/entities/itinerary/api/queryfn.ts:12` (entities → features, 역방향), `src/features/RoutePlanning/model/types.ts:1`
- 영향: CLAUDE.md가 명시한 단방향 규칙이 실제로는 광범위하게 깨져 있다. 다만 **심각한 역방향 위반은 2건뿐**이고 나머지는 딥임포트·상대경로라 기계적으로 고칠 수 있다. 실험 A~D 어느 것의 사전 조건도 아니므로 우선순위는 낮다.
- 측정 지표:
  - 역방향 import **2건** (shared→entities 1, entities→features 1) → 0
  - 동일 레이어 features↔features 교차 슬라이스 import **22건 / 17파일** → 0
  - `index.ts` 우회 딥임포트 **80건** (entities 34, features 실질 46 — 자기 재노출 5건 제외) → 0
  - `../../` 상대경로 **96건 / 57파일** → 0 (경로 별칭으로 치환)
- 예상 규모: L

### [P4-2] 데드 코드 `src/stories/StyleTest/` 1,370줄 · 실험 —

- 근거: `src/stories/StyleTest/model/constants.ts` (315줄), `src/stories/StyleTest/ui/ZIndex.stories.tsx` (252줄), `src/` 전체에서 `StyleTest` 문자열 참조 **0건**(자기 자신 외)
- 영향: **프로덕션 번들에는 들어가지 않는다**(참조 그래프상 미도달, Storybook 전용). 즉 번들 크기 개선 효과는 없고 줄 수·유지보수 부담만 줄인다. 이 구분을 흐리면 "삭제로 번들이 줄었다"는 잘못된 기록이 남는다.
- 측정 지표: 데드 코드 1,370줄 → 0줄, 번들 gzip 변화 **0 B 예상**(검증 대상). `src/shared/model/utils.ts`의 `cn` export는 유일한 사용처가 StyleTest라 함께 죽는다 → `cn` 구현 2벌(`shared/model/utils.ts`, `shared/lib/cn.ts`)이 1벌로 정리됨
- 예상 규모: S

### [P4-3] 검증 커버리지 — e2e가 19라우트 중 4개만 방문 · 실험 A B

- 근거: `src/e2e/auth.spec.ts`, `src/e2e/location-detail.spec.ts` (spec 파일 총 2개)
- 영향: 유일한 동작 검증 수단이 e2e인데 실제로 방문하는 고유 라우트는 `/auth/login`, `/auth/signup`, `/mypage`, `/location/1` **4개뿐**이다. 나머지 15라우트는 빌드가 통과한다는 것 외에 아무 보증이 없다. Storybook story는 49개로 많지만 이는 시각 확인용이지 회귀 테스트가 아니다.
- 측정 지표: 단위 테스트 **0개**, e2e spec 2개, e2e 커버 라우트 **4 / 19 (21%)**, story 파일 49개
- 예상 규모: L (전체 커버리지 확대 기준) / M (P0-4의 스키마 단위 테스트만이라면)

### [P4-4] `as any` 프로덕션 11건, 대부분 카카오맵 유틸에 집중 · 실험 —

- 근거: `src/features/MapSection/model/utils.ts:205, 215, 220, 222, 224, 230` (6건 — 전체 11건의 절반 이상이 이 파일)
- 영향: 카카오맵 SDK에 타입 정의가 없어 생긴 것으로 보인다. SDK 타입을 한 번 선언하면 대부분 해소된다.
- 측정 지표: `as any` 프로덕션 **11건**(생성물 `routeTree.gen.ts` 19건은 제외) → 0, `: any`/`any[]` **6건 / 4파일** → 0. console.log는 프로덕션 코드 **0건**(`*.stories.tsx`에만 존재)
- 예상 규모: M

### [P4-5] 미사용/중복 의존성 · 실험 B (주의)

> **[부분 종결 2026-07-29 → [`05-B`](./05-B-tanstack-form-vs-rhf.md)]** `react-hook-form`은 실험 B 결론(TanStack 유지)에 따라 **제거 완료** — 제거 후 번들 diff 0B로 미사용 실측 확정. `lucide`·`tailwindcss-animate`·`tw-animate-css` 중복은 미처리.

- 근거: `package.json:38` (`react-hook-form ^7.62.0`), `package.json:34-35` (`lucide` + `lucide-react`), `src/index.css:3,13` (`tw-animate-css`가 **같은 파일에 2번 import**)
- 영향: **`react-hook-form`은 지금 제거하면 안 된다.** 실험 B가 이 라이브러리를 실제로 구현해 비교하는 실험이다. 제거 판단은 실험 B의 결론에 종속된다. 나머지는 독립적으로 정리 가능.
- 측정 지표 (실제 import 건수를 센 결과):
  | 패키지 | 사용처 | 조치 |
  |---|---|---|
  | `react-hook-form` | **0건** | 실험 B까지 **보류** |
  | `lucide` (비-react) | **0건** | 제거 |
  | `tailwindcss-animate` | **0건** | 제거 |
  | `tw-animate-css` | 2건 (`index.css`에 중복 import) | 중복 1건 제거 |
  | `@dnd-kit/*` | 4건 (`RoutePlaceCard.tsx` 2, `RouteSidebar.tsx` 2) | **사용 중 — 유지** |
  | `zod` | 4.1.5 + 하위 3.25.76 | 메이저 혼재 정리 |

  direct dependency 54개 → 3개 제거 후 51개, 제거 전후 gzip diff (실측 필요)

- 예상 규모: S

### [P4-6] `format:check`가 `ci`에 없다 (루트·nextjs 공통) · 실험 —

- 근거: 루트 `package.json:15` (`"ci": "npm run lint && npm run type-check && npm run build"`), nextjs 코드 실제 들여쓰기(4-space)가 nextjs `.prettierrc`(`tabWidth: 2`)와 불일치
- 영향: 포맷 위반이 CI를 그대로 통과한다. nextjs는 실제로 설정과 어긋난 상태로 커밋돼 있다.
- 측정 지표: `prettier --check .` 위반 파일 수 (미측정) → 0
- 예상 규모: S

---

## 3. 리팩토링 로드맵

원칙(goals.md §"이미 정해진 것"): **부채 제거 → baseline 재측정 → 실험**. 부채가 섞인 상태의 비교 수치는 원인 귀속이 안 된다.

```
Phase 0 ──┬─→ Phase 1 (독립) ─→ …
          └─→ Phase 2 ─→ Phase 3(실험) ─→ Phase 4
```

### Phase 0 — 측정 기반 복구 (모든 실험의 절대 선행 조건)

| #   | 작업                                                             | 실험    | 규모 | 이유                                                            |
| --- | ---------------------------------------------------------------- | ------- | ---- | --------------------------------------------------------------- |
| 0-1 | eslint config에 `.claude/**` Node 전역 추가 → `npm run ci` green | A B C D | S    | 회귀 판정 수단 복구. **이것 없이는 아무것도 증명 못 한다**      |
| 0-2 | `public/` 문서 이미지를 빌드에서 제외                            | B D     | S    | 번들 지표에서 68% 노이즈 제거                                   |
| 0-3 | `manualChunks`로 vendor 청크 분리                                | B D     | S~M  | **"라이브러리 기여분 gzip" 지표가 지금은 산출 불가**            |
| 0-4 | vitest node 러너 도입 + auth 스키마 단위 테스트                  | A B     | M    | 폼·스키마 리팩토링의 회귀 감지. **§4-2에서 필수 게이트로 확정** |
| 0-5 | **baseline 재측정 후 `docs/refactor/01-baseline.md` 기록**       | 전부    | S    | 이후 모든 diff의 기준점                                         |

Phase 0을 먼저 하는 이유: 0-3이 없으면 실험 B·D의 주 지표를 아예 잴 수 없고, 0-1이 없으면 어떤 변경도 "깨졌는지" 판정할 수 없다. 순서를 뒤집으면 실험을 다시 해야 한다.

### Phase 1 — 정확성 위험 (실험과 독립, 병행 가능)

| #   | 작업                                                                                                                             | 실험 | 규모 |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| 1-1 | `main.py:122-129` httpbin.org 요청별 외부 호출 제거                                                                              | —    | S    |
| 1-2 | 예외 문자열 응답 노출 5곳 차단                                                                                                   | —    | S    |
| 1-3 | nextjs 드리프트 결함 5건 수정 (`useDeleteItinerary` 부재, `alert()`, Sidebar 순차 페치, locationApi 복붙, AuthContext 죽은 타입) | C    | M    |

1-3은 실험 C의 전제다. 실험장(nextjs)이 결함 상태면 LCP·CLS 측정에 교란 변수가 섞인다. 1-1/1-2는 어느 실험과도 무관하므로 언제 해도 된다.

**§4-1 결정에 따른 1-3의 범위 축소**: 루트 정본 + nextjs 드리프트 허용이 확정됐으므로, 1-3은 "두 앱을 같게 만드는 작업"이 아니라 **실험 C의 측정 대상 화면(이미지가 있는 라우트)에 영향을 주는 결함만** 고친다. Sidebar 순차 페치(LCP에 직접 영향)는 반드시 포함하고, `useDeleteItinerary` 부재·`alert()` 같은 마이페이지 결함은 이미지 측정과 무관하므로 후순위로 내려도 된다.

### Phase 2 — 부채 제거 (실험 지표 정화)

| #    | 작업                                                                                            | 실험 | 규모 | 왜 실험 **전**이어야 하나                                                                |
| ---- | ----------------------------------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------------------------------------------------- |
| 2-1  | `useParams`/`useSearch` 수동 단언 5곳 → `validateSearch` + zod                                  | D    | M    | 지금 재면 "TanStack Router는 타입 이점 없음"이라는 **거짓 결론**이 나온다                |
| 2-2  | `requireAuth`/`requireGuest` 가드 헬퍼 중앙화 (6곳)                                             | D    | S    | 보일러플레이트가 Router의 코드량으로 잘못 계상되는 것 방지                               |
| 2-3  | `ValidatorConfig` 중복 정의 통합 (2곳→1곳)                                                      | A B  | S    | 실험 A의 before 코드량을 정직하게 만듦                                                   |
| 2-4  | 인라인 queryKey 9곳 중앙화 + `mypageKeys` 신설                                                  | —    | S~M  | 폼 mutation invalidate 정합성                                                            |
| 2-5  | `useEffect`+직접 fetch 2곳 → TanStack Query, 동명 훅 중복 제거                                  | —    | S    | 저위험 즉시 개선                                                                         |
| 2-6  | 데드 코드 제거 (`StyleTest` 1,370줄 + `cn` 중복 2벌→1벌, `db.py` 죽은 함수 53줄)                | —    | S    | 줄 수 지표 정화. **번들은 안 줄어든다**(StyleTest는 프로덕션 미도달) — 기록 시 구분할 것 |
| 2-7  | `lucide`·`tailwindcss-animate` 제거(각 0건), `tw-animate-css` 중복 import 정리, zod 메이저 혼재 | —    | S    | **`react-hook-form`은 실험 B까지 유지**, `@dnd-kit`은 사용 중이라 유지                   |
| 2-8  | FSD 위반 수정 — 역방향 2건 → 딥임포트 80건 → `../../` 96건 순                                   | —    | L    | 실험 사전 조건 아님. **역방향 2건만 먼저 하고 나머지는 Phase 4로 미뤄도 된다**           |
| 2-9  | `as any` 11건 정리 (카카오맵 SDK 타입 선언으로 6건 일괄 해소)                                   | —    | M    | 실험 A·D의 "타입 단언 수" 지표와 혼선 방지 — 폼·라우터 외 단언을 미리 걷어냄             |
| 2-10 | **baseline 재측정 → `docs/refactor/02-debt-removal.md`**                                        | 전부 | S    | goals.md가 요구하는 "제거도 수치와 함께"                                                 |

### Phase 3 — 실험 (goals.md A~D)

권장 순서와 이유:

| 순서 | 실험                                     | 선행 조건        | 왜 이 순서인가                                                                                                                                                    |
| ---- | ---------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **C** — next/image vs `<img>`            | 1-3              | 다른 실험과 간섭이 없고(nextjs 내부 완결), 인프라가 이미 준비돼 있어 가장 빨리 산출물이 나온다. `<img>` 3곳이 이미 eslint-disable로 표시돼 있다                   |
| 2    | **A** — zod × TanStack Form 결합 최적화  | 0-4, 2-3         | **B의 A안을 만드는 작업이다.** 정리되지 않은 이중 배선 상태를 RHF와 비교하면 "TanStack Form이 장황하다"는 결론이 나오는데, 그건 라이브러리가 아니라 사용법 문제다 |
| 3    | **B** — TanStack Form vs React Hook Form | A 완료, 0-3, 0-4 | A의 결과물이 A안. auth 4개 폼으로 범위 한정(P2-5)                                                                                                                 |
| 4    | **D** — TanStack Router vs React Router  | 0-3, 2-1, 2-2    | 범위 축소 필수(goals.md: 전면 마이그레이션 금지). 대표 라우트 서브셋 + 번들 기여분 + params 타입 안전성 3축                                                       |

각 실험은 `/ab-compare` 절차를 따르고 `TEMPLATE.md` 형식으로 `docs/refactor/03-C-next-image.md` 식으로 기록한다.

> **[진행 상태 2026-07-29]** C 완료([03-C](./03-C-next-image.md)) · A 완료([04-A](./04-A-zod-tanstack-form.md)) · B 완료([05-B](./05-B-tanstack-form-vs-rhf.md), RHF 불채택·의존성 제거) · **D 완료**([06-D](./06-D-tanstack-router-vs-react-router.md), RR 불채택 — +9.4KB·하위 레이어 22파일 결합 실측). **실험 A~D 전부 종료.**
>
> **실험 D 착수 규칙 (순서 함정 방지)**: 2-1(`useParams`/`useSearch` 수동 단언 정리)을 **D의 before 측정보다 먼저 완료**하고, **2-1 자체의 before/after 수치도 기록**한다 — 단언 45% 상태로 재면 "TanStack Router는 타입 이점 없다"는 거짓 결론이 나오고, 단언 정리 결과가 곧 D의 A안 "수동 단언 수" 지표 측정이기 때문이다. 2-2(가드 중앙화)도 동일하게 D 이전 완료.

### Phase 4 — 독립 트랙 (실험 무관, 언제든)

> **[선별 종결 2026-07-29 → [`07-phase4-selective.md`](./07-phase4-selective.md)]** Phase 4는 전량 수행하지 않기로 결정. 실험 서사와 연결되는 3건(as any 12→0, SaveRouteModal 표준화, FSD 역방향 2→0)만 수행하고, **나머지 7건(main.py 분해, 딥임포트 치환 등)은 근거와 함께 의도적 미수행으로 종결** — 선별 기준과 항목별 판단은 07 문서.

| #   | 작업                                                                                                              | 규모 |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 4-1 | `main.py` 459줄 → 4~5모듈 분해 (요청 검증 / DB / 지오 / LLM / 오케스트레이터, 최대 파일 ~140줄)                   | L    |
| 4-2 | functions 테스트 도입 (분해 **전**에 최소 스모크 테스트 — 검증 수단 0인 상태의 대수술은 위험)                     | M    |
| 4-3 | requirements.txt 버전 고정, 타입 힌트 21% → 확대, `function-config.yaml` timeout 불일치 정정                      | S    |
| 4-4 | `format:check`를 `ci`에 편입 (루트·nextjs)                                                                        | S    |
| 4-5 | `LocationReviews.tsx` 368줄 분해 — 한 파일에 컴포넌트 4개(StarRating / ReviewCard / LocationReviews / ReviewForm) | S    |
| 4-6 | `terms.tsx` 293줄 — 로직 없는 정적 텍스트(h2 섹션 12개). 분해가 아니라 **콘텐츠 데이터 분리**가 맞다              | S    |
| 4-7 | FSD 딥임포트 80건 + `../../` 96건 (2-8의 나머지) — 기계적 치환                                                    | M    |
| 4-8 | auth 밖 폼 표준화 — 실험 A·B 결론 적용. `contact.tsx` 265줄은 크기가 아니라 **API 미연동이 핵심 문제**            | M    |

제외 판단: `MapSection/model/utils.ts` 257줄은 카카오맵 유틸이 응집돼 있어 **파일 분해 실익이 낮다.** 이 파일은 분해가 아니라 2-9(`as any` 6건)와 FSD import 방향 정리 대상이다.

---

## 4. 결정 사항 (2026-07-29 확정)

### 4-1. 정본 워크스페이스와 `ai-itinerary` 처리 → **루트 정본, nextjs는 실험 C 실험장**

**결정: 루트(Vite)를 정본으로 고정한다. nextjs 드리프트는 의도적으로 허용하고, nextjs는 실험 C(next/image) 전용 실험장으로만 유지한다. `ai-itinerary` 약 1,538줄은 루트로 역이식하지 않고 nextjs 전용으로 남긴다.**

이 결정이 로드맵에 미치는 영향:

- Phase 1-3(nextjs 드리프트 결함 5건 수정)은 **전면 동기화가 아니라 실험 C에 필요한 최소 범위로 축소**한다. 목적이 "두 앱을 같게 만드는 것"이 아니라 "실험장에서 교란 변수를 없애는 것"이기 때문이다.
- 227쌍의 차이나는 파일을 맞추는 작업은 **하지 않는다.** 드리프트는 관리 대상이 아니라 허용된 상태다.
- 실험 A·B·D는 전부 루트에서 수행한다 (auth 훅은 양쪽 로직이 동등하므로 위치가 결과에 영향을 주지 않는다).
- `ai-itinerary`가 `functions/itinerary_theme`의 실제 소비자일 가능성이 높다 → Phase 4-1(main.py 분해) 시 계약 변경이 nextjs에만 영향을 준다는 점을 유의.

<details>
<summary>결정 근거가 된 조사 사실</summary>

- **로직 레이어는 루트가 최신**이다. PR #106(마이페이지 동선 수정·삭제), #111(전체 리팩토링)이 루트에만 반영됐고, nextjs는 그 이전 스냅샷에서 이관(`2e23df6`, 2025-11-07)된 뒤 동기화가 끊겼다.
- 그러나 **nextjs는 루트에 없는 `ai-itinerary` 약 1,538줄을 독자 보유**한다. "nextjs = 뒤처진 사본"이라는 전제는 전체적으로 성립하지 않는다.
- auth 훅 8개(4개가 아니라 8개다)는 양쪽 로직이 **완전 동등**하다.

</details>

### 4-2. 단위 테스트 러너(vitest) 도입 시점 → **실험 전 (Phase 0-4로 확정)**

**결정: 실험을 시작하기 전에 도입한다.** 실험 A·B가 zod 스키마와 폼 검증 로직을 직접 뜯어고치는 작업이고, e2e는 19라우트 중 4개(21%)만 커버하므로 폼 회귀를 잡지 못한다. M 규모의 선행 비용을 감수한다.

로드맵 반영: Phase 0-4는 **선택이 아니라 필수 게이트**다. 실험 C(Phase 3-1)만은 폼·스키마를 건드리지 않으므로 0-4 완료를 기다리지 않고 병행할 수 있다.

---

## 4-B. 아직 결정되지 않은 것

- **`react-hook-form` 최종 처리** — 실험 B의 결론에 종속된다. B가 끝나기 전에는 제거도 유지도 확정할 수 없다.
- **실험 D의 범위** — goals.md가 전면 마이그레이션을 금지했다. "대표 라우트 서브셋"을 몇 개로, 어느 라우트로 잡을지는 실험 착수 시점에 정한다 (후보: 동적 params가 있는 `content.$contentId.map`, search params를 쓰는 `verify-email`, 가드가 있는 `mypage`).
- **`functions/` 입력 검증과 프론트 zod 스키마의 중복 여부** — §5 참조. 확인되면 새 부채 항목이 된다.

---

## 5. 조사하지 못한 것

- `prettier --check .` 실제 위반 파일 수 (미측정)
- `functions/`의 입력 검증(`main.py:170-213`, 필드 4개·enum 2개·약 70줄 if-체인)과 프론트 zod 스키마의 **실제 중복 여부** — 파이썬 감사는 지시상 프론트를 보지 않았다. 중복이 확인되면 "스키마가 프론트·백 양쪽에 이중 존재"라는 별도 부채 항목이 된다
- 실험 D의 "라이브러리 gzip 기여분" 현재값 — Phase 0-3(vendor 분리) 이후에만 측정 가능
- 폼 코드의 런타임 동작(검증 타이밍, 리렌더 횟수) — 정적 분석만 수행. 실험 B의 "리렌더 횟수" 지표는 실측 필요
- warm 캐시 빌드 시간 — cold만 측정했다 (`tsc -b` 109초는 최초 `.tsbuildinfo` 생성 비용)
- 미사용 export 전수 조사 — `StyleTest`와 `cn`만 확인했고 `src/` 전체 미사용 export 개수는 미측정
- `useMemo`/`useCallback` **42건 / 12파일** 중 실제로 불필요한 것이 몇 개인지 — 표본 1개만 확인했다. "불필요한 메모이제이션 제거"를 부채로 주장하려면 전수 판정이 먼저 필요하다
- `as` 키워드 전체 172건 / 56파일은 `import type` 별칭을 포함한 **과대 추정치**라 이 문서의 지표에서 제외했다. 신뢰할 수 있는 수치는 `as any` 11건과 폼·라우터의 단언 9건뿐이다

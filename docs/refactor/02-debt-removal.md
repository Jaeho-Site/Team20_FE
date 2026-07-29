# [02] Phase 2 부채 제거 — 2-4 ~ 2-7 수치 기록

> 작성일: 2026-07-29 · 대상: 루트 Vite + functions · 브랜치 `refactor/phase2-debt-removal` (main `073b29a`에서 분기)
> 원칙(goals.md 목표 1): **제거도 수치(번들 diff·의존성 수·줄 수)와 함께 기록한다.**

## 시작 시점 baseline (main `073b29a`)

JS gzip 합계 **212.53 KB** (11청크) · CSS gzip 19.91 KB · direct dependency **54** · 참고: 실험 D 사전 작업에서 zod 청크가 12.15→13.47KB로 증가(라우트 검색 검증에 zod가 널리 임포트됨 — 타입 안전성의 번들 비용으로 기록)

## 항목별 수치

### 2-4. 인라인 queryKey 중앙화 (`1304609`)

| 지표                                 | before                                                     | after                                                                                  |
| ------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 인라인 queryKey 리터럴               | 9곳                                                        | **0**                                                                                  |
| 같은 데이터의 캐시 네임스페이스 분열 | `content-locations`가 중앙 키와 리터럴 **2벌** (이중 페치) | **1벌** (중복 페치 제거)                                                               |
| 신설 키                              | —                                                          | `mypageKeys`(entities/user), `authKeys.emailVerification`, `locationQueryKeys.details` |

키 값은 전부 기존과 동일 유지(invalidation 정합). **FSD 보고**: entities/itinerary → entities/user 교차 import 1건 허용 (도메인 간 invalidate — 리터럴보다 낫다고 판단, P4-1 정리 때 재검토).

### 2-5. `useEffect` 직접 페치 → TanStack Query (`7e7fade`)

| 지표                                  | before                                    | after                                                                   |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `useState`+`useEffect` 직접 페치      | 2곳 (매 마운트 재요청, 캐시 없음)         | **0**                                                                   |
| 동명 훅 중복 (`usePopularContents`)   | 2벌 (import 위치에 따라 캐시 유무가 다름) | **1벌** — feature 쪽은 `usePopularContentsSuggest`로 개명, 중앙 키 공유 |
| `useEmailVerificationQuery`(entities) | export만 되고 소비 0                      | feature 훅이 소비 (409→성공 매핑 등 동작 유지)                          |

### 2-6. 데드 코드 삭제 (`e8e2135`)

| 지표                     | before                | after                 | 번들 diff                                                                                                                                          |
| ------------------------ | --------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/stories/StyleTest/` | 1,372줄               | 0                     | **JS 0 B (예측 적중 — 프로덕션 미도달)** · **CSS gzip −0.5 KB (17.24→16.74)** — Storybook 전용 클래스가 tailwind 스캔에 잡혀 있었음 (예상 밖 실측) |
| `cn` 구현                | 2벌                   | 1벌 (`shared/lib/cn`) | —                                                                                                                                                  |
| `functions/db.py`        | 203줄 (죽은 함수 2개) | **146줄 (−57)**       | 해당 없음 (`py_compile` 검증)                                                                                                                      |

**분석 정정**: 00-analysis P4-2의 "cn 유일 사용처는 StyleTest"는 오진 — `IconButton`도 사용 중이어서 삭제 시 ci가 잡아냈고, 정본 `shared/lib/cn`(twMerge 기반)으로 전환했다.

### 2-7. 미사용·중복 의존성 (`2f7355d`)

| 지표                               | before          | after                                                                                             | 번들 diff                           |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| direct dependency                  | 54              | **52** (`lucide`, `tailwindcss-animate` 제거 — 둘 다 import 0건)                                  | **0 B** (미사용 실증)               |
| `tw-animate-css` `@import`         | 같은 파일에 2번 | 1번                                                                                               | 0 B (이미 dedupe되고 있었음 — 실측) |
| zod 메이저 혼재 (4.1.5 vs 3.25.76) | —               | **기록으로 종결**: router-plugin 하위 devDep transitive, 코드 생성기 전용이라 번들 무관·제거 불가 | —                                   |

## 종합

| 지표         | Phase 2 시작                                 | 종료                                | 차이                                                                                                                                                 |
| ------------ | -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| JS gzip 합계 | 212.53 KB                                    | 212.53 KB                           | **0 B** — 이번 부채는 전부 번들 비영향 부류였음을 실측으로 확정 (기록의 요점: "삭제로 번들이 줄었다"는 거짓 서사 차단, 00-analysis P4-2의 경고 이행) |
| CSS gzip     | 19.91 KB                                     | **19.41 KB**                        | −0.5 KB                                                                                                                                              |
| 삭제 줄 수   | —                                            | **−1,432줄** (src 1,375 + db.py 57) |                                                                                                                                                      |
| direct deps  | 54                                           | **52**                              | −2 (05-B의 rhf 포함 시 원 54→52, 누적 −3 +lighthouse +1)                                                                                             |
| 검증         | `npm run ci` green (21/21, cn 회귀 테스트 3개 포함) · `py_compile` OK |                                     |                                                                                                                                                      |

## 적대적 검토 결과 반영 (code-reviewer, Critical 1 / Warning 4)

- **Critical 반영 — cn 전환이 히어로 CTA 텍스트 색을 지움**: 기본 twMerge는 커스텀 타이포 유틸(`text-button-large` 등 `_typography.css`의 14종)을 **색상 그룹으로 오분류**해 `text-[--color-text-inverse] text-button-large` 병합 시 색상 클래스를 삭제한다 — `node` 1줄 실증 후 `extendTailwindMerge`로 font-size 그룹 등록, **회귀를 `cn.test.ts` 3케이스로 고정** (테스트 18→21개). `npm run ci`가 못 잡는 시각 회귀를 리뷰가 잡은 사례.
- **Warning 반영 — 이메일 인증이 refetch 가능한 쿼리가 됨**: 탭 복귀 시 소비된 토큰으로 재호출돼 성공 화면이 에러로 뒤집힐 수 있는 경로 → `staleTime: Infinity` + refetch 비활성 (1회성 검증 의미론 고정).
- **Warning 반영 — `__pycache__` 산출물 커밋 유입**: py_compile 부산물 pyc가 스테이징에 딸려 들어감 + 기존 tracked pyc 1개 발견 → 둘 다 untrack, `.gitignore`에 `__pycache__/` 추가.
- **Warning 반영 — 수치 off-by-one**: db.py −56 → 실측 **−57**(203→146), 합계 −1,431 → **−1,432** 정정.
- 확인 완료(문제 없음): 리터럴 키 잔존 0건 전수 grep, mypageKeys 순환 없음, select 캐시 공유 안전, db.py 삭제 함수 참조 0. nextjs 쪽은 리터럴 키·구 훅 유지 — 드리프트 허용 결정 범위이나 auth 훅 중복의 격차는 커짐(기록).

## 재현 방법

```bash
npm install && npm run ci && npm run build   # 청크별 gzip은 빌드 출력
python -m py_compile functions/itinerary_theme/db.py
node -e "const p=require('./package.json'); console.log(Object.keys(p.dependencies).length + Object.keys(p.devDependencies).length)"
```

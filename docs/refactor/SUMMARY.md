# kspot-refactor — 결과 요약 (진입점)

> 처음 읽는 사람용. 상세는 각 문서 링크로. 최종 갱신: 2026-07-29 (실험 A~D 종료 시점)

## 이 저장소가 하려는 것

1년 전 만든 레거시(K-콘텐츠 촬영지 여행 서비스, Vite + React 19 + TanStack 스택)를 리팩토링하되, **"고쳤다"가 아니라 "수치로 증명했다"를 산출물로 삼는다.** 당시의 기술 선택(TanStack Router/Query/Form, zod)을 대안과 실제로 구현·측정해 재검증하고, 모든 변경을 before/after 수치와 함께 이 디렉토리에 남긴다. 우선순위 기준은 [`goals.md`](./goals.md), 전체 부채 지도와 로드맵은 [`00-analysis.md`](./00-analysis.md).

## 실험 4종 결론

| 실험  | 비교                                              | 판정                                        | 핵심 수치                                                                                                                                                                                                         | 문서                                              |
| ----- | ------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **C** | next/image vs `<img>` (nextjs 앱 내부)            | **채택** — next/image 전환                  | 이미지 전송 **−88.7%** (1,443→163KB, 전부 avif 협상), 포스터 LCP **9.6s→4.4s**. 단, bytes −88%에도 LCP 불변인 화면 존재(비선형성 실측). 부분 최적화가 이중 로드로 **+13%** 역효과 내는 함정도 재측정으로 검출     | [03-C](./03-C-next-image.md)                      |
| **A** | zod × TanStack Form 공식 결합 vs 기존 이중 배선   | **채택** — 스키마 직접 바인딩               | 이중 배선 **9→0**, 타입 단언·any **9→0**, 폼 코드 **−28%**(913→655줄). 필드별 에러 UX는 Playwright 검사 **7/7 유지** — before도 정상이었음을 계측으로 확인(잘못된 개선 서사 차단)                                 | [04-A](./04-A-zod-tanstack-form.md)               |
| **B** | TanStack Form vs React Hook Form (동일 조건 구현) | **불채택** — TanStack 유지, RHF 의존성 제거 | RHF가 오히려 **+1.3KB gzip** (resolver 포함 10.86 vs 8.66KB). 리렌더는 RHF **2.1배 우세**(20타 25 vs 53회)인 혼합 결과 — 사전 등록 기준으로 판정. 제거 후 번들 diff **0B**(미사용 실측 확정)                      | [05-B](./05-B-tanstack-form-vs-rhf.md)            |
| **D** | TanStack Router vs React Router (배선 서브셋)     | **불채택** — TanStack 유지                  | RR이 **+9.4KB gzip (+44%)**, params 추론·검색 검증·가드를 재발명해야 함. 전환 비용의 실체는 라우트 파일이 아니라 **하위 레이어 22개 파일의 결합**(실측). 사전 작업으로 수동 단언 5→0 정리 후 측정(거짓 결론 방지) | [06-D](./06-D-tanstack-router-vs-react-router.md) |

한 줄 요약: **채택 2(next/image, zod 직접 바인딩), 불채택 2(RHF, React Router)** — "표준이라 가볍다"는 통념이 두 번 모두 실측에서 역전됐고, 현 스택(TanStack + zod)이 수치로 확정됐다.

## 방법론

모든 실험은 같은 절차를 따랐다: **판정 기준을 측정 전에 문서에 고정**하고(사후 합리화 방지), 대안을 실제로 구현해(별도 브랜치: `experiment/B-react-hook-form`, `experiment/D-react-router`) **같은 조건**(같은 zod 스키마·같은 표시 계층·같은 검증 타이밍)에서 **재실행 가능한 스크립트**로 측정했다 — `npm run measure`(Lighthouse 5회 median + Playwright 이미지 지표, MSW 고정 픽스처로 백엔드 변동 차단), `scripts/check-field-messages.mjs`(UI 에러 표시 검사), `scripts/count-renders.mjs`(리렌더 계측), manualChunks 분리로 라이브러리별 gzip 기여분 산출. 모든 변경은 독립 컨텍스트의 적대적 코드 리뷰를 거쳤고(리뷰가 잡은 실결함: 숫자형 토큰 무력화 등), **부정적·혼합 결과를 그대로 기록**했으며, 측정 원본은 [`measurements/`](./measurements/)에 커밋해 제3자가 재현할 수 있다(사용자 본인의 독립 재현 기록: `measurements/aa5026d/self-check/`).

## 부채 정리 결과

- [`01-baseline.md`](./01-baseline.md) — Phase 0 측정 기반 복구 (CI green, vendor 청크 분리, vitest 도입, dist −68% 노이즈 제거)
- [`02-debt-removal.md`](./02-debt-removal.md) — Phase 2: queryKey 중앙화 9→0, useEffect 페치 2→0, 데드 코드 −1,432줄, deps 54→52 (번들 diff 0B 실측 — "삭제로 줄었다" 거짓 서사 차단)
- [`07-phase4-selective.md`](./07-phase4-selective.md) — Phase 4 **선별 수행**: 서사 연결 3건만 수행(as any 12→0, 폼 표준 4→5, FSD 역방향 2→0), **나머지 7건은 근거와 함께 의도적 미수행 종결** (main.py 분해 = 검증 수단 0, 딥임포트 치환 = 도구의 일 등)
- [`TEMPLATE.md`](./TEMPLATE.md) — 실험 기록 형식

**프로젝트 상태: 계획된 작업 전체 종결.** 실험 4종 완료 + 부채는 수행/의도적 미수행으로 전수 처분. 남은 것은 조건부 항목뿐(백엔드 복구 시 실험 C 재검증, contact API 계약 시 폼 표준화 등 — 각 문서에 명시).

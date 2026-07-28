# [03] 실험 C — next/image vs `<img>` (nextjs 앱 내부 비교)

> 작성일: 2026-07-29 · 대상: nextjs · 커밋: before `42059b3` / after `ca61b05`

## 1. 무엇을 비교/변경했는가

nextjs 앱의 `<img>` 3곳(전부 `eslint-disable @next/next/no-img-element`로 우회 중)을 `next/image`로 전환했을 때 런타임 이미지 지표가 실제로 개선되는지. 같은 nextjs 앱 안에서 비교해 프레임워크 교란 변수를 차단한다 (goals.md 실험 C).

- `features/LocationDetail/ui/LocationHero.tsx` — `/location/{id}` 히어로 (LCP 요소, 서버 fetch 데이터)
- `features/LocationDetail/ui/LocationRelatedContents.tsx` — 관련 콘텐츠 포스터 그리드 (클라이언트 React Query)
- `features/ContentOverviewHero/ui/ContentOverviewHero/ContentOverviewHeroClient.tsx` — `/content/{id}` 히어로 (서버 fetch 데이터)

## 2. 실험 설계

- **A안 (before)**: 순수 `<img>` 3곳 — 커밋 `42059b3`
- **B안 (after)**: `next/image` 전환 (fill + 컨테이너 유지, 히어로 2곳 `priority`, 그리드 `sizes` 지정). **비교 대상 외 변경 없음**
- **동일 조건**: MSW 고정 픽스처(`nextjs/src/mocks/fixtures.mjs`) + `public/mock-assets/` 로컬 고정 이미지 5종(jpg 3, png 2, 총 약 2.75MB). 같은 라우트(`/location/1`, `/content/1`), 같은 측정 스크립트(`npm run measure --mock`), 같은 세션 연속 측정
- **판정 기준 (측정 전 고정)**:
  - **채택**: 이미지 전송 bytes **30% 이상 감소** 그리고 CLS 악화 없음(+0.02 이내) → next/image 채택
  - **보류**: bytes 감소가 30% 미만이거나 LCP가 10% 이상 **악화** → 원인 분석 후 재판단
  - LCP 개선은 부차 지표 (simulated throttling에서 이미지 bytes에 종속적으로 움직임)
  - 포맷 협상: after에서 webp/avif 응답이 관측되어야 next/image 최적화가 실제 동작한 것

## 3. 측정 조건

| 항목      | 값                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------- |
| 머신/OS   | Windows 11 Home 10.0.26200                                                                                |
| 측정 도구 | `npm run measure --mock` (Lighthouse 5회 median, mobile·simulate·headless 고정, Playwright chromium 고정) |
| 서버      | `next build --turbopack` + `next start -p 3100` (standalone 아님, next/image 옵티마이저 활성)             |
| API       | MSW(서버: instrumentation msw/node, 브라우저: worker) + 빌드 타임 스텁 — 라이브 백엔드 무관               |
| 반복      | 라우트당 Lighthouse 5회, 이미지 지표는 Playwright 1회(전송 bytes는 고정 자산이라 결정적)                  |

## 4. 결과

원본 기록: `measurements/42059b3/C-before-img/`, `measurements/ca61b05/C-after-next-image/`

### `/location/1` (Lighthouse 5회 median)

| 지표              | A안 `<img>`    | B안 next/image | 차이                | 신뢰도                                                 |
| ----------------- | -------------- | -------------- | ------------------- | ------------------------------------------------------ |
| 이미지 전송 bytes | 1,893,206      | 231,767        | **−87.8%**          | 높음 (고정 자산, 결정적)                               |
| 협상 포맷         | jpeg 2 / png 2 | **avif 4**     | 협상 성공           | 높음                                                   |
| total byte weight | 2,300,121      | 644,151        | −72.0%              | 높음                                                   |
| LCP               | 5,524 ms       | 5,391 ms       | −2.4% (노이즈 수준) | **낮음** — before 분포가 5,486~9,701ms로 이봉(bimodal) |
| perf score        | 0.57           | 0.59           | +0.02               | 중간                                                   |
| CLS               | 0.000          | 0.000          | 악화 없음           | 높음                                                   |
| TBT               | 691 ms         | 843 ms         | +22%                | 낮음 (run 간 편차 큼)                                  |

### `/content/1` (Lighthouse 5회 median)

| 지표                        | A안 `<img>`        | B안 next/image    | 차이                      | 신뢰도                                |
| --------------------------- | ------------------ | ----------------- | ------------------------- | ------------------------------------- |
| 이미지 전송 bytes           | 1,442,550          | 632,341           | **−56.2%**                | 높음                                  |
| 협상 포맷                   | jpeg 2             | avif 1 + jpeg 1   | 전환분만 avif (아래 참조) | 높음                                  |
| — 전환한 히어로 포스터 단독 | 862,346 (원본 jpg) | **52,421 (avif)** | **−93.9%**                | 높음                                  |
| total byte weight           | 1,817,177          | 1,007,158         | −44.6%                    | 높음                                  |
| LCP                         | 9,629 ms           | 4,429 ms          | **−54.0%**                | 높음 (before 편차 9,557~9,631로 좁음) |
| perf score                  | 0.56               | 0.75              | +0.19                     | 중간                                  |
| CLS                         | 0.000              | 0.000             | 악화 없음                 | 높음                                  |
| TBT                         | 761 ms             | 388 ms            | −49%                      | 낮음                                  |

측정하지 못한 지표: 실네트워크 RTT 기반 LCP (throttling은 simulate 고정), 라이브 백엔드 이미지(CDN 등 외부 호스트)에서의 옵티마이저 동작.

## 5. 해석

- **판정 기준 충족**: 두 라우트 모두 이미지 bytes 30% 이상 감소(−87.8% / −56.2%), CLS 악화 없음 → **B안(next/image) 채택.** avif 협상도 실측으로 확인됐다.
- **직관과 반대인 결과 먼저**: `/location/1`은 이미지 bytes를 88% 줄였는데 **LCP가 사실상 안 움직였다**(−2.4%, 노이즈 수준). before의 LCP 분포가 이봉(5.5s/9.7s)인 점까지 고려하면 이 라우트에서 LCP 개선을 주장할 수 없다. bytes 감소가 곧 LCP 개선이라는 등식은 화면 구조에 따라 성립하지 않는다.
- 반면 `/content/1`은 LCP 요소가 전환 대상인 포스터 이미지 그 자체라 bytes 감소가 LCP에 직결됐다 (9.6s → 4.4s, −54%).
- `/content/1`에 남은 jpeg 579,920B는 **분석(00-analysis P3-2)의 "3곳" 목록에 없던 4번째 `<img>`** — `LocationImageCarousel`(서버 컴포넌트)이 직접 로드한다. 이번 실험 범위(3곳) 밖이라 의도적으로 남겼다.
- TBT는 두 라우트에서 방향이 반대(+22% / −49%)이고 run 간 편차가 커서 결론에 쓰지 않는다.

## 6. 정성 평가 (수치 아님)

- `fill` + 기존 컨테이너(aspect/height 클래스) 조합이라 레이아웃 코드 변경이 거의 없었다 (3파일, +32/−16줄).
- `priority`(LCP 히어로)와 `sizes`(그리드)를 지정하지 않으면 이점이 온전하지 않다 — 전환 자체보다 이 두 속성이 핵심.
- 목 이미지가 루트 상대 URL이라 `remotePatterns` 추가가 불필요했다. 라이브 백엔드(외부 CDN) 이미지는 이미 등록된 5개 호스트로 커버되나 실측은 못 했다.

## 7. 결론과 다음 행동

- **채택: B안 (next/image 전환 유지)** — 근거: §5 판정 기준 충족.
- 후속:
  1. `LocationImageCarousel`의 4번째 `<img>` 전환 (예상: `/content/1` 이미지 bytes 추가 약 −580KB)
  2. 라이브 백엔드 복구 시 외부 호스트 이미지로 1회 재검증
  3. `/location/1` LCP 이봉 분포의 원인 조사 (force-dynamic SSR 변동 의심)

## 8. 이력서 문장 (goals.md 이력서 지표)

- MSW 고정 픽스처로 측정 환경을 통제하고 next/image 전환 효과를 실측 — 이미지 전송량 최대 88% 절감(avif 협상), 포스터 LCP 9.6s→4.4s(−54%) 개선
- 이미지 88% 경량화에도 LCP가 불변인 화면을 함께 기록 — 전송량과 LCP의 비선형 관계를 실측으로 규명

## 9. 재현 방법

```bash
npm install && cd nextjs && npm install && cd ..
# before: git checkout 42059b3
npm run measure -- --target=nextjs --mock --routes=location/1,content/1 --label=C-before-img
# after: (전환 커밋) 동일 명령, --label=C-after-next-image
# 주의: Git Bash에서 --routes에 선행 슬래시를 쓰면 MSYS 경로 변환으로 깨진다
```

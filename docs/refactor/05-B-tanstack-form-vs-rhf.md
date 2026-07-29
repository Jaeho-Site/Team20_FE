# [05] 실험 B — TanStack Form vs React Hook Form (auth 폼, zod 스키마 공유)

> 작성일: 2026-07-29 · 대상: 루트 Vite · A안 커밋: `2fc71d0` / B안: 브랜치 `experiment/B-react-hook-form` (RHF 구현 커밋)

## 1. 무엇을 비교하는가

같은 auth 4개 폼을 두 폼 라이브러리로 구현했을 때의 정량 차이. `react-hook-form`은 dependencies에 있으나 사용처 0곳 — 이 실험의 결론이 **의존성 제거 여부(00-analysis P4-5)를 확정**한다.

## 2. 실험 설계

- **A안**: `@tanstack/react-form` 1.23.5 + zod 4.1.5 직접 바인딩 (실험 A 결과물)
- **B안**: `react-hook-form` 7.62.0 + `@hookform/resolvers`(standard-schema resolver) + **같은 zod 스키마**
- **동일 조건**: 같은 4개 폼·같은 표시 계층(`FormFieldWrapper`/`Input`)·같은 검증 타이밍(change+blur, blur 후 표시)·같은 mutations·같은 렌더 프로브(`useRenderProbe`). B안은 별도 브랜치(`experiment/B-react-hook-form`)에 구현 — main 스택에 RHF를 섞지 않는다 (fsd-architecture.md 규칙)
- **판정 기준 (측정 전 고정)**:
  - **B안(RHF) 채택 조건 (전부 충족해야)**: 초기 JS gzip 합계 3KB 이상 절감 + 리렌더 동등 이하 + UI 실표시 7/7 유지 + 폼 코드량 +15% 이내
  - 그 외 → **TanStack Form 유지 + `react-hook-form` 의존성 제거 확정**
  - 축별 차이가 다음 미만이면 "유의미한 차이 없음"으로 기록: gzip 3KB, 리렌더 2배, 코드량 15%

## 3. 측정 지표와 방법

| #   | 지표                                          | 방법                                                                                               | 신뢰도                   |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | 라이브러리 기여분 gzip                        | manualChunks 분리 청크(tanstack-form+store 몫 vs react-hook-form) + 초기 JS gzip 합계 diff         | 높음                     |
| 2   | 폼 구현 줄 수                                 | 동일 파일 집합 `wc -l`                                                                             | 높음                     |
| 3   | 입력 시 리렌더 (20타: email 10 + password 10) | `node scripts/count-renders.mjs` — 프로덕션 빌드(StrictMode 이중 렌더 없음), 필드행·폼 루트 카운트 | 중간 (3회 측정)          |
| 4   | 필드별 메시지 UI 실표시                       | `node scripts/check-field-messages.mjs` 7케이스                                                    | 높음 (B안 유효성 게이트) |

## 4. 측정 조건

| 항목 | 값                                                                                    |
| ---- | ------------------------------------------------------------------------------------- |
| A안  | 브랜치 `refactor/phase0-measurement-base` (실험 A 완료 상태)                          |
| B안  | 브랜치 `experiment/B-react-hook-form` (A안에서 분기, 폼 구현만 교체)                  |
| 빌드 | `vite build` 동일 설정 (rhf 청크 규칙은 양쪽 공통 — A안에서는 미사용이라 청크 미발생) |
| 측정 | 같은 세션 연속, 같은 스크립트                                                         |

## 5. 결과

| 지표                                               | A안 TanStack Form                                                                                    | B안 React Hook Form                       | 차이                   | 신뢰도        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------- | ------------- |
| 라이브러리 청크 gzip                               | **8.66 KB** (tanstack-form)                                                                          | **10.86 KB** (rhf + resolvers)            | A안 −2.2 KB            | 높음          |
| — 공유 store                                       | tanstack-store 1.46 KB는 **router가 함께 써서 B안에서도 잔존** — form의 한계 기여분 아님 (실측 확인) |                                           |                        | 높음          |
| 초기 JS gzip 합계                                  | 211.19 KB                                                                                            | 212.51 KB                                 | **B안 +1.32 KB**       | 높음          |
| 폼 구현 코드 (동일 파일 집합)                      | 659줄                                                                                                | 677줄 (+RhfFormControls 어댑터 90줄 포함) | +2.7% — 동등 범위      | 높음          |
| 리렌더: 20타 동안 필드행 (3회 측정, 3회 모두 동일) | email 22 + password 31 = **53**                                                                      | email 13 + password 12 = **25**           | **B안 2.1배 우세**     | 높음 (결정적) |
| 리렌더: 폼 루트                                    | 0                                                                                                    | 0                                         | 동등                   | 높음          |
| 필드별 메시지 UI 실표시                            | 7/7                                                                                                  | 7/7                                       | 동등 (B안 게이트 통과) | 높음          |
| 스키마 테스트 / lint / tc / build                  | green                                                                                                | green                                     |                        |               |

측정하지 못한 지표: 대형 폼(수십 필드)에서의 리렌더 스케일링 — auth 폼은 최대 4필드라 외삽 불가.

## 6. 해석

- **판정: B안 불채택 → TanStack Form 유지 + `react-hook-form` 의존성 제거 확정** (P4-5 종결). 사전 기준상 B안 채택은 "초기 JS gzip 3KB 이상 절감"을 포함한 전 축 충족이 조건이었는데, 번들은 오히려 **+1.32 KB 무거워졌다** (RHF 자체는 경량이지만 resolver 포함 청크가 tanstack-form보다 큼).
- **직관과 반대인 결과를 그대로 기록**: "RHF가 번들이 가볍다"는 통념은 이 조건(zod resolver 포함, 앱이 이미 @tanstack/store를 router로 쓰는 상태)에서는 성립하지 않았다. 공유 의존성까지 계산하면 라이브러리 선택의 번들 효과는 앱의 기존 스택에 종속된다.
- **RHF의 리렌더 우세(2.1배)는 실재한다.** TanStack의 form-level 스키마 검증은 키입력마다 상대 필드 행까지 갱신한다(password 타이핑 중 email 행도 리렌더). 다만 절대량 기준 20타에 53회의 소형 행 컴포넌트 렌더는 auth 폼 규모에서 체감 비용이 없다 — 수십 필드 폼이라면 결론이 달라질 수 있다 (측정 못 한 축으로 명시).
- 코드량·UX·타입 안전성은 동등. 어느 쪽도 zod 스키마 공유(standard-schema)에 문제 없음.

## 7. 정성 평가 (수치 아님)

- B안 구현에서 표시 계층을 공유하려면 어댑터(RhfFieldRenderer 90줄)가 필요했다 — RHF의 fieldState 모양이 달라서다. 반대로 A안은 실험 A에서 만든 구조적 타입에 그대로 안착했다.
- RHF `mode: 'all'`이 A안의 onChange+onBlur 타이밍과 정확히 일치 — 빈 필드 blur 케이스(7번째)도 추가 코드 없이 통과.
- 전환 비용: 폼 훅·UI 전부 재작성 필요 (이번 실험이 그 증거). 얻는 것이 리렌더뿐이면 auth 규모에서는 근거 부족.

## 8. 결론과 다음 행동

- **채택: A안 (TanStack Form 유지).** `react-hook-form`은 base 브랜치에서 제거 — 제거 후 재빌드 결과 **번들 diff 0 B** (미사용 의존성이었음을 실측 확정), direct dependency 1개 감소.
- B안 구현은 `experiment/B-react-hook-form` 브랜치에 보존 (재검증·대형 폼 실험 시 재사용).
- 후속: 대형 폼이 생기면 리렌더 축만 재실험 가치 있음. Phase 2-7의 나머지 미사용 의존성(`lucide`, `tailwindcss-animate`, `tw-animate-css` 중복)은 별도 정리.

## 9. 이력서 문장 (goals.md 이력서 지표)

- TanStack Form vs React Hook Form을 동일 조건(zod 스키마·UI·검증 타이밍 공유)으로 실측 비교 — 번들 +1.3KB·리렌더 2.1배 우세가 교차하는 혼합 결과에서 사전 등록한 판정 기준으로 현 스택 유지를 결정, 미사용 의존성 제거
- "RHF가 가볍다"는 통념이 기존 스택(공유 의존성) 조건에서 역전됨을 수치로 기록 — 기술 선택은 벤치마크가 아니라 자기 앱의 조건에서 측정해야 함을 입증

## 10. 재현 방법

```bash
# A안 (refactor/phase0-measurement-base)
npm install && npm run build          # 청크 gzip은 빌드 출력에서
node scripts/count-renders.mjs        # 리렌더
node scripts/check-field-messages.mjs # UI 7케이스
# B안: git switch experiment/B-react-hook-form 후 동일 명령
```

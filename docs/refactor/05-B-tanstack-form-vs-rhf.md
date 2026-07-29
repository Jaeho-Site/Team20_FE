# [05] 실험 B — TanStack Form vs React Hook Form (auth 폼, zod 스키마 공유)

> 작성일: 2026-07-29 · 대상: 루트 Vite · A안 커밋: (기입 예정) / B안 브랜치: `experiment/B-react-hook-form`

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

(측정 후 기입)

## 6. 해석

(측정 후 기입)

## 7. 정성 평가 (수치 아님)

(측정 후 기입)

## 8. 결론과 다음 행동

(측정 후 기입)

## 9. 이력서 문장 (goals.md 이력서 지표)

(측정 후 기입)

## 10. 재현 방법

```bash
# A안 (refactor/phase0-measurement-base)
npm install && npm run build          # 청크 gzip은 빌드 출력에서
node scripts/count-renders.mjs        # 리렌더
node scripts/check-field-messages.mjs # UI 7케이스
# B안: git switch experiment/B-react-hook-form 후 동일 명령
```

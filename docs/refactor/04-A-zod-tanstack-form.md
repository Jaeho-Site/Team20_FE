# [04] 실험 A — zod × TanStack Form 결합 최적화

> 작성일: 2026-07-29 · 대상: 루트 Vite · 커밋: before `a82548d` / after `1dd26bf`

## 1. 무엇을 비교/변경했는가

auth 4개 폼의 zod × TanStack Form 배선을 공식 결합 경로로 재설계했을 때 코드·타입 안전성·UX(필드별 메시지)가 어떻게 변하는지. 이 결과물이 실험 B(vs React Hook Form)의 A안이 된다.

**before의 구조적 문제 (00-analysis P2-1·P2-2 실측 확인)**:

- 같은 스키마를 두 메커니즘으로 이중 배선: form-level `onChange`가 전체 스키마를 try/catch로 parse해 **항상 제네릭 메시지 하나**(`'입력값을 확인해주세요'`)로 뭉개고, field-level은 `schema.shape.필드`를 **또 한 번** 별도 parse (`useFormValidation.ts` 117줄)
- `confirmPassword` 일치 검사는 스키마 `refine`에 있는데 field validator가 **코드로 한 번 더 재구현** (메시지 문자열도 중복)
- `defaultValues ... as XFormData` 타입 단언 4곳, `ValidatorConfig` 인터페이스 글자 그대로 중복 정의 2곳, 의도적 `any` 5곳
- blur 후 에러 표시를 위해 TanStack 내장 `meta.isTouched/isBlurred` 대신 **커스텀 touchedFields Set**을 병행 운영

**after (B안) 설계**: `validators: { onChange: schema }` 직접 바인딩 (TanStack Form v1 Standard Schema 지원 — zod 이슈가 필드별로 자동 매핑됨), field-level 별도 배선·useFormValidation 삭제, blur 게이트는 내장 `meta.isBlurred`, defaults는 스키마 파일에 콜로케이트.

## 2. 측정 지표 (goals.md 3개 + 사용자 추가 1개)

| #   | 지표                                                                        | 측정 방법                                                                                                   | 신뢰도                 |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | 스키마 중복 배선 수 (전체 parse 우회 4 + shape 재parse 4 + refine 재구현 1) | 코드 카운트                                                                                                 | 높음                   |
| 2   | 타입 단언·any 수 (`as XFormData` 4 + 의도적 any 5)                          | `rg` + 수동 확인                                                                                            | 높음                   |
| 3   | 폼 구현 코드 줄 수 (auth 폼 관련 파일 합계 + 폼당)                          | `wc -l`                                                                                                     | 높음                   |
| 4   | **zod 필드별 메시지가 UI에 실제 표시되는가** (신규)                         | `node scripts/check-field-messages.mjs` — Playwright로 6개 필드 케이스에 잘못된 값 입력 후 표시 텍스트 검사 | 높음 (결정적 DOM 검사) |

## 3. 판정 기준 (측정 전 고정)

- **성공**: `validators: { onChange: schema }` 바인딩 0→4, 단언·any 9→0, **UI 필드별 메시지 표시가 before 대비 저하 없음**(6/6 유지 또는 개선), 스키마 테스트 18개 green, `npm run ci` green
- **실패로 기록**: 리팩토링 후 필드별 메시지가 하나라도 표시되지 않게 되면 — 코드가 줄어도 UX 회귀면 실패다
- 줄 수 감소는 부차 지표 (감소 예상이지만 판정 조건 아님)

## 4. 측정 조건

| 항목        | 값                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| UI 검사     | `vite build` + `vite preview` + Playwright chromium (백엔드 불필요 — 검증은 클라이언트 사이드)                                               |
| 검사 케이스 | login: email 형식·password 길이 / signup: nickname 길이·confirmPassword 불일치 / forgot-password: email 형식 / reset-password: password 길이 |
| 단위 테스트 | `npm test` (스키마 메시지 고정 18개 — 스키마 자체는 이번 실험에서 불변)                                                                      |

## 5. 결과

| 지표                                                                                                | before                | after                           | 차이                                                                  |
| --------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `validators: { onChange: schema }` 직접 바인딩                                                      | 0 / 4 폼              | **4 / 4**                       | 공식 결합 경로 정착                                                   |
| 스키마 중복 배선 (form-level 수동 parse 4 + field-level `shape` 재parse 4종 + refine 코드 재구현 1) | 9                     | **0**                           | 스키마 단일 출처                                                      |
| `as XFormData` 단언                                                                                 | 4                     | **0**                           | defaults를 스키마 파일에 콜로케이트                                   |
| 의도적 `any` (`eslint-disable no-explicit-any`)                                                     | 5                     | **0**                           | TanStack 필드를 구조적 부분집합 타입으로 수용                         |
| 훅 줄 수 (login/signup/reset/resetReq)                                                              | 39/42/39/40 (평균 40) | 27/27/26/28 (**평균 27, −33%**) |                                                                       |
| 폼 관련 파일 합계 (동일 집합, 스키마 포함)                                                          | 913줄                 | **655줄 (−258, −28%)**          | `useFormValidation` 116줄 삭제 포함                                   |
| **필드별 메시지 UI 실표시 (신규 지표)**                                                             | **6/6**               | **7/7**                         | **저하 없음 — 판정 기준 충족** (7번째 케이스는 §6-B의 리뷰 지적 경로) |
| 스키마 메시지 고정 테스트                                                                           | 18/18                 | 18/18                           | 스키마 불변 증명                                                      |
| lint / type-check / build                                                                           | green                 | green                           |                                                                       |

UI 검사 상세: login(email 형식·password 길이), signup(nickname 길이·confirmPassword 불일치), forgot-password(email), reset-password(password) — 6케이스 모두 zod 필드별 메시지가 정확히 표시, 제네릭 메시지('입력값을 확인해주세요') 표시 0건 (before/after 동일).

## 6. 해석

- **판정 기준(§3) 전부 충족 — 성공.**
- **직관과 반대인 결과 먼저**: before에서도 UI는 필드별 메시지를 6/6 표시하고 있었다. P2-1의 "필드별 메시지가 제네릭으로 뭉개진다"는 form-level 채널에 한정된 사실이었고, field-level 이중 배선이 그 결함을 **보상**하고 있었다. 즉 이 리팩토링의 실질 성과는 UX 개선이 아니라 — **같은 UX를 절반의 배선으로 유지**한 것이다 (−258줄, 단언·any 9→0). 신규 지표(UI 실표시)를 넣지 않았다면 "메시지가 고쳐졌다"는 잘못된 서사를 썼을 것이다.
- confirmPassword 일치 검사가 스키마 `refine` 단일 출처가 됐다. 이전에는 같은 검사·같은 메시지 문자열이 스키마와 field validator 코드에 각각 존재했다.
- password를 나중에 바꿔도 confirmPassword 에러가 갱신된다 — form-level onChange가 전체 스키마를 재평가하므로 cross-field 검증이 자동으로 정확해진다 (이전에는 fieldApi로 상대 필드를 수동 조회).

## 6-B. 적대적 검토 결과 반영 (code-reviewer, Critical 0 / Warning 1)

- **Warning 반영**: `onChange: schema`만 바인딩하면 **입력 없이 focus→blur한 필드에 필수 입력 에러가 안 뜬다** (before는 field-level onBlur validator가 커버하던 경로. 최초 검사 6케이스는 전부 "잘못된 값 입력 후 blur" 패턴이라 이 경로를 놓쳤다). → 훅 4개에 `onBlur: schema` 추가, 검사 스크립트에 7번째 케이스로 고정. 재검증 7/7.
- 리뷰가 실측으로 확인한 개선 2건 (수정 불요, 기록만):
  - before는 confirmPassword field validator에 `onChangeListenTo`가 없어 **password를 나중에 바꾸면 confirmPassword 에러가 stale**이었다. after는 form-level 재평가로 자동 갱신 — 리팩토링이 잠복 결함을 함께 해소했다.
  - zod 4.1.5는 다른 필드가 min 검증에 실패해도 `refine`을 실행한다 (zod 3의 ZodEffects 스킵과 다름) — 불일치 에러 억제 시나리오 없음을 실측 확인.

## 7. 정성 평가 (수치 아님)

- blur 후 에러 표시는 내장 `meta.isBlurred`로 충분했다. 커스텀 touchedFields Set 병행 운영은 불필요한 재발명이었다.
- "공식문서가 any 쓰라고 합니다" 주석(FormFieldRenderer)은 근거를 상실했다 — 래퍼가 실제로 쓰는 형태만 구조적 타입으로 선언하면 23개 제네릭 없이 타입 안전하게 수용된다.
- Standard Schema 바인딩에서 errors는 이슈 객체(`{ message }`)로 오므로 표시 계층에서 message 추출이 필요하다 (문자열 가정 코드는 깨진다).

## 8. 결론과 다음 행동

- **채택: 직접 바인딩 구조 유지.** 이 상태가 실험 B(vs React Hook Form)의 A안이 된다.
- 남긴 것:
  - nextjs 쪽 중복 auth 훅 4개는 **의도적으로 미변경** (§4-1 드리프트 허용 결정) — 드리프트 발생 사실 기록
  - zod `.email()`은 v4에서 deprecated (동작함) — `z.email()` 전환은 스키마 변경이라 별도 작업으로 분리
  - 리렌더 횟수 지표는 실험 B에서 RHF와 함께 측정 (단독 측정은 비교 기준이 없음)

## 9. 이력서 문장 (goals.md 이력서 지표)

- zod 스키마를 단일 출처로 TanStack Form 검증 재설계 — 이중 배선 9곳→0, 타입 단언·any 9→0, 폼 코드 28% 감소, 필드별 에러 UX 동등성은 Playwright 자동 검사(6/6)로 증명
- 리팩토링 전 UI가 이미 정상임을 계측으로 먼저 확인 — "깨진 것을 고쳤다"가 아니라 "같은 동작을 절반의 코드로"를 정직하게 기록

## 10. 재현 방법

```bash
npm install
node scripts/check-field-messages.mjs        # UI 필드별 메시지 검사 (빌드 포함)
npm test                                     # 스키마 메시지 고정 테스트
# 정적 카운트: rg "as LoginFormData|as SignupFormData|as PasswordReset" src/features/auth
#              rg "no-explicit-any" src/features/auth
```

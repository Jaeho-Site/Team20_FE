# [01] Phase 0 — 측정 기반 복구와 baseline 재측정

> 작성일: 2026-07-29 · 대상: 루트 Vite · 커밋: `b83d108` + Phase 0 uncommitted 변경 (브랜치 `refactor/phase0-measurement-base`)

## 1. 무엇을 변경했는가

00-analysis 로드맵의 Phase 0 (모든 실험의 절대 선행 조건) 5개 작업:

| #   | 작업                                                                                                                      | 변경 파일                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 0-1 | eslint `ignores`에 `.claude/**` 추가 (hooks는 앱 코드가 아니므로 Node 전역 추가 대신 ignore 선택)                         | `eslint.config.js`                                                    |
| 0-2 | 문서 이미지 9개 `public/` → `docs/images/` (git mv), README 참조 8곳 갱신                                                 | `README.md`, `docs/images/*`                                          |
| 0-3 | `manualChunks`로 라이브러리별 청크 분리 — form·router가 공유하는 `@tanstack/store`는 귀속 왜곡 방지를 위해 별도 청크      | `vite.config.ts`                                                      |
| 0-4 | vitest `unit` 프로젝트(node 환경) 신설 + auth 스키마 4개의 필드별 에러 메시지 고정 테스트 18개, `npm test` 신설·`ci` 편입 | `vite.config.ts`, `package.json`, `src/features/auth/model/*.test.ts` |
| 0-5 | 본 문서 (재측정)                                                                                                          | —                                                                     |

## 2. 측정 조건

| 항목      | 값                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------- |
| 머신/OS   | Windows 11 Home 10.0.26200                                                                                |
| 캐시 상태 | node_modules 기설치, dist warm (단일 실행) — before(00-analysis §1.2)는 cold라 빌드 시간은 직접 비교 불가 |
| 반복 횟수 | 1 (번들 크기는 결정적, 시간은 참고치)                                                                     |
| 측정 주체 | benchmark-runner subagent                                                                                 |

## 3. 결과 — before/after

### 3.1 검증 수단 (0-1, 0-4)

| 지표                 | before (00-analysis)      | after                                  | 차이                                  |
| -------------------- | ------------------------- | -------------------------------------- | ------------------------------------- |
| `npm run lint`       | exit 1, **31 errors**     | **exit 0, 0 errors**                   | 회귀 판정 수단 복구                   |
| `npm run type-check` | exit 0                    | exit 0                                 | —                                     |
| `npm run build`      | exit 0                    | exit 0                                 | —                                     |
| 단위 테스트          | 러너 없음, 0개            | **`npm test` 신설, 18/18 통과 (2.7s)** | 폼·스키마 회귀 감지 수단 신설         |
| `ci` 구성            | lint + type-check + build | lint + type-check + **test** + build   | **로컬 게이트 한정** — 아래 주의 참조 |

**주의(리뷰 지적)**: GitHub Actions는 `npm run ci`를 호출하지 않는다. `deploy.yml`은 lint·build를 개별 실행하고 `e2e.yml`은 e2e만 돈다. 즉 신규 단위 테스트는 **원격 CI에서 강제되지 않는다.** deploy.yml에 test 스텝을 넣을지는 배포 파이프라인 변경이라 별도 결정 사항으로 남긴다.

### 3.2 번들 (0-2, 0-3)

| 지표                             | before        | after           | 차이                                              |
| -------------------------------- | ------------- | --------------- | ------------------------------------------------- |
| dist 전체                        | 5,392,225 B   | **1,726,878 B** | **−68.0%** (문서 이미지 3,674,555 B 제거)         |
| JS 청크 수                       | 1             | 9               | 라이브러리별 분리                                 |
| JS 합계 gzip                     | 211,239 B     | 211,748 B       | **+509 B (+0.24%)** — 분리 오버헤드는 노이즈 수준 |
| "chunks larger than 500 kB" 경고 | 있음          | **없음**        | —                                                 |
| `vite build` 소요                | 47.3 s (cold) | 14.54 s (warm)  | 조건 다름 — 비교 불가로 기록                      |

### 3.3 라이브러리별 gzip 기여분 (신규 측정 가능 지표 — 실험 B·D의 기준선)

| 청크                                     | raw B            | gzip B         |
| ---------------------------------------- | ---------------- | -------------- |
| react-vendor (react/react-dom/scheduler) | 186,647          | 58,603         |
| index (앱 코드)                          | 185,335          | 46,534         |
| vendor (기타 3rd-party)                  | 159,793          | 52,544         |
| **tanstack-router**                      | 66,482           | **21,385**     |
| **zod**                                  | 45,156           | **12,161**     |
| **tanstack-query**                       | 34,954           | **10,345**     |
| **tanstack-form**                        | 31,498           | **8,659**      |
| tanstack-store (form·router 공유)        | 4,152            | 1,461          |
| tanstack-query-devtools                  | 36               | 56             |
| index CSS / vendor CSS                   | 125,659 / 14,155 | 17,066 / 2,673 |

실험 B(폼)·D(라우터)는 이 표의 해당 행을 A안 수치로 사용한다.

## 4. 해석

- 00-analysis P0-2 "라이브러리 기여분 gzip 산출 불가"는 해소됐다. TanStack Form의 실제 기여분은 gzip 8.7KB(+공유 store 1.5KB)로, 실험 B에서 react-hook-form 구현과 직접 비교 가능하다.
- 분리 오버헤드 +509B(+0.24%)는 측정 가능성의 대가로 무시할 수준이다.
- dist −68%는 **번들 개선이 아니라 측정 노이즈 제거**다. JS는 사실상 그대로다. 이력서 문장에 "번들 68% 감소"로 쓰면 안 된다.
- 00-analysis §1.3의 정정("차액 약 0.86MB는 src 유래 앱 자산")이 실측으로 확인됐다: dist에 남은 유일한 이미지는 `k-drama-squidgame-horizontal-*.jpg` **862,346 B**(앱 자산, dist의 50%). 이미지 최적화(압축·포맷 변환) 후보로 새로 기록한다 — 단 이것은 루트(Vite) 쪽이므로 실험 C(nextjs)와는 별개 트랙.
- `dist/mockServiceWorker.js` 9,080 B는 여전히 프로덕션 dist에 포함된다(MSW devDep 전용인데 `public/`에 있어야 dev가 동작). 크기가 작아 Phase 0에서는 유지, 기록만 남긴다.

## 5. 남긴 것 / 새 후속 항목

- `k-drama-squidgame-horizontal.jpg` 862KB — dist의 50%. 압축/webp 전환 후보 (신규, 실험 C와 별개).
- `mockServiceWorker.js` dist 포함 — 유지 결정, 필요 시 빌드 후 제거 스크립트로 해결 가능.
- nextjs 워크스페이스는 이번 변경과 무관 (드리프트 없음 — vite.config·eslint·public 이미지는 루트 전용). 단 nextjs 쪽 중복 스키마 4파일은 여전히 무검증 상태다 (§4-1 결정상 nextjs는 실험 C 전용이므로 허용).
- 단위 테스트는 로컬 `npm run ci`에만 편입 — **GitHub Actions(deploy.yml) 편입 여부는 미결정** (§6 참조).
- 빌드 시간 warm/cold 비교는 이후 측정에서 조건 통일 필요.

## 6. 적대적 검토 결과 반영 (code-reviewer, Critical 0 / Warning 4)

| 지적                                                                                                        | 처리                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tanstack/query-devtools`(devtools 코어)가 향후 lazy import 시 tanstack-query 측정 청크에 오귀속될 수 있음 | **반영** — devtools 체크에 `@tanstack/query-devtools` 추가 (vite.config.ts)                                                                                                                                   |
| `npm run ci`를 GitHub Actions가 호출하지 않아 단위 테스트가 원격 미강제                                     | **문서에 명시** (§3.1 주의) — deploy.yml 수정은 배포 파이프라인 변경이라 별도 결정으로 이관                                                                                                                   |
| unit 프로젝트 `extends: true`가 storybook·router 플러그인까지 상속 (react-docgen 로그, prepare 시간)        | **반영** — `plugins: [tsconfigPaths()]`만 명시. 단, routeTree.gen.ts 재기록은 vitest가 루트 config를 로드하는 한 남는데, `git diff` 내용 0줄(줄바꿈만)이라 `.gitattributes`(`eol=lf`)로 유령 diff 자체를 제거 |
| `public/mockServiceWorker.js`가 msw postinstall ↔ prettier 간 포맷 루프                                    | **반영** — `.prettierignore` 신설 (routeTree.gen.ts 포함)                                                                                                                                                     |

미반영 없음. 반영 후 재검증: `npm test` 18/18, `npm run build` exit 0, 청크 gzip 수치 §3.3과 동일(zod 12.16 / router 21.39 / vendor 52.54 / index 46.53 / react-vendor 58.60 kB) 확인.

## 7. 재현 방법

```bash
npm install
npm run lint        # exit 0
npm run type-check  # exit 0
npm test            # 18/18 (unit 프로젝트만)
npm run build       # dist 생성
du -sb dist         # 전체 크기 (dist는 gitignore라 일부 셸 명령이 permission에 막힘 — du/node로 우회)
# 청크별 gzip: gzip -c dist/assets/<file> | wc -c
```

---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# FSD 레이어 규칙 (루트 Vite 앱)

## 의존 방향 — 위에서 아래로만

```
app  →  pages  →  features  →  entities  →  shared
```

- 역방향 import 금지 (`shared`가 `entities`를 부르는 코드는 버그다).
- **같은 레이어의 다른 슬라이스끼리도 import 금지.** `features/MapSection`이 `features/Sidebar`를 직접 부르면 안 된다. 공유가 필요하면 아래 레이어(`entities`/`shared`)로 내리거나, 상위(`pages`)에서 조립한다.
- 위반을 발견하면 조용히 고치지 말고 **먼저 보고**한다. 레이어 위반은 대개 설계 결정이 필요한 지점이다.

## 슬라이스 구조

각 슬라이스는 `ui/`, `model/`, `api/`, `hooks/` 세그먼트를 갖고 `index.ts`로만 외부에 노출한다.

- 밖에서는 `@/entities/location`처럼 슬라이스 루트만 import한다. `@/entities/location/api/locationApi`처럼 내부를 직접 파고들지 않는다.
- 새 파일을 슬라이스에 추가하면 `index.ts`의 public API를 갱신할지 판단한다. 내부 구현이면 노출하지 않는 것이 맞다.

## 레이어별 책임

| 레이어 | 넣을 것 | 넣지 말 것 |
|---|---|---|
| `shared` | http 클라이언트, 공통 UI 프리미티브, 유틸, 훅 | 도메인 개념(location, itinerary…) |
| `entities` | 도메인 타입, queryKeys, queryFn, API 호출 | 화면 조립, 페이지 전용 상태 |
| `features` | 사용자 시나리오 단위 UI + 그 UI에 붙는 훅 | 라우팅, 전역 provider |
| `pages` | 라우트 컴포넌트, feature 조립 | 재사용 가능한 UI 구현 |
| `app` | provider, 전역 레이아웃, 스타일 | 도메인 로직 |

## TanStack 규약 (이 저장소의 핵심 관심사)

- 서버 상태는 전부 TanStack Query로 다룬다. `useState` + `useEffect`로 fetch하는 코드를 발견하면 리팩토링 후보로 기록한다.
- queryKey는 각 entity의 `api/queryKeys.ts`에 모은다. 컴포넌트에 문자열 배열을 인라인하지 않는다.
- 폼은 TanStack Form + zod validator 조합을 표준으로 한다. `react-hook-form`은 현재 **미사용 의존성**이므로 새로 도입하지 않는다 — 비교 실험 목적이라면 `/ab-compare` 절차를 따라 별도 브랜치에서 한다.
- zod 스키마는 폼과 API 응답 검증에서 재사용 가능한지 먼저 확인한다. 같은 모양의 스키마를 두 번 쓰지 않는다.

## 라우팅

- 라우트는 `src/pages/`의 파일 이름이 곧 경로다(`content.$id.tsx` → `/content/$id`). 파일을 추가/이름변경하면 `routeTree.gen.ts`가 재생성된다 — **생성물은 직접 편집하지 않는다.**
